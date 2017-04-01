from urlparse import urljoin
from urllib import urlencode
import urllib2
import json
import time
import boto3
import random

PINGDOMUSER   = 'someone@example.com'
PINGDOMPASS   = 'mypassword'
PINGDOMAPPKEY = 'myappkey'
DYNAMODBTABLE = 'pingdom-cache'

name = {}
status = {}
lasterrortime = {}
type = {}

random.seed()

def lambda_handler(event, context):
    global name
    global status
    global lasterrortime
    global websites
    global cacheupdates
    websites = 0
    cacheupdates = 0
    dynamodb = boto3.resource('dynamodb', region_name='eu-west-1')
    cache = dynamodb.Table(DYNAMODBTABLE)
    p = Pingdom(username=PINGDOMUSER, password=PINGDOMPASS, appkey=PINGDOMAPPKEY)
    #checks = p.method('checks')['checks']
    response = p.method(url='checks', method='GET',
                parameters={'include_tags':'true'})
    checks = response['checks']
    for check in checks:
        #print(json.dumps(check))
        websites += 1
        id = str(check['id'])
        name[id] = str(check['name'])
        status[id] = str(check['status'])
        if 'lasterrortime' in check:
            lasterrortime[id] = int(check['lasterrortime'])
        else:
            lasterrortime[id] = 0
        if 'tags' in check:
            tags = check['tags']
            for tag in tags:
                #print(json.dumps(tag))
                if 'name' in tag:
                    if tag['name'] == 'customer':
                        type[id] = 'customer'
                    if tag['name'] == 'internal':
                        type[id] = 'internal'
                    if tag['name'] == 'external':
                        type[id] = 'external'
        if not id in type:
            type[id] = 'unknown'
    
    for id in name:
        response = cache.get_item(
            Key={
                'id' : id
            }
        )
        if 'Item' in response:
            cacheitem = response['Item']
        else:
            cacheitem = {}
        now = int(time.time())
        onehour = 60*60
        oneday = 24*onehour
        oneweek = 7*oneday
        onemonth = 30*oneday
        threemonths = 3*onemonth
        if not 'cacheupdate' in cacheitem:
            cacheitem['cacheupdate'] = 0
        if not 'status' in cacheitem:
            cacheitem['status'] = ''
        if lasterrortime[id] > now - oneday or cacheitem['cacheupdate'] < now - oneday or status[id] != cacheitem['status'] or cacheitem['type'] == 'unknown' or percentchance(5):
            starttime = now - oneday
            uptime = p.method(url='summary.average/'+id, method='GET',
                parameters={'from':str(starttime),'to':str(now),'includeuptime':'true'})['summary']
            totaltime = uptime['status']['totalup'] + uptime['status']['totaldown']
            if totaltime == 0:
                totaltime = 1
            availability1day = uptime['status']['totalup'] * 10000 / totaltime
            starttime = now - oneweek
            uptime = p.method(url='summary.average/'+id, method='GET',
                parameters={'from':str(starttime),'to':str(now),'includeuptime':'true'})['summary']
            totaltime = uptime['status']['totalup'] + uptime['status']['totaldown']
            if totaltime == 0:
                totaltime = 1
            availability1week = uptime['status']['totalup'] * 10000 / totaltime
            starttime = now - onemonth
            uptime = p.method(url='summary.average/'+id, method='GET',
                parameters={'from':str(starttime),'to':str(now),'includeuptime':'true'})['summary']
            totaltime = uptime['status']['totalup'] + uptime['status']['totaldown']
            if totaltime == 0:
                totaltime = 1
            availability1month = uptime['status']['totalup'] * 10000 / totaltime
            starttime = now - threemonths
            uptime = p.method(url='summary.average/'+id, method='GET',
                parameters={'from':str(starttime),'to':str(now),'includeuptime':'true'})['summary']
            totaltime = uptime['status']['totalup'] + uptime['status']['totaldown']
            if totaltime == 0:
                totaltime = 1
            availability3months = uptime['status']['totalup'] * 10000 / totaltime
            states = p.method(url='summary.outage/'+id, method='GET',
                parameters={'from':str(starttime),'to':str(now),'order':'desc'})['summary']['states']
            lasterrorstart = 0
            lasterrorend = 0
            for state in states:
                #print(json.dumps(state))
                if state['status'] == 'down':
                    lasterrorstart = state['timefrom']
                    lasterrorend = state['timeto']
                    break
            #print(json.dumps(lastdown))
            cache.put_item(
                Item={
                    'id' : id,
                    'name' : name[id],
                    'status' : status[id],
                    'type' : type[id],
                    'lasterrortime' : lasterrortime[id],
                    'availability1day' : availability1day,
                    'availability1week' : availability1week,
                    'availability1month' : availability1month,
                    'availability3months' : availability3months,
                    'lasterrorstart' : lasterrorstart,
                    'lasterrorend' : lasterrorend,
                    'cacheupdate': now
                }
            )
            cacheupdates = cacheupdates + 1
            print("Updating "+name[id]+" ("+str(id)+")")
    
    print("Websites: "+str(websites))
    print("Cache updates: "+str(cacheupdates)+"\n")

def percentchance(p):
    i = random.randint(1, 100)
    if i < p:
        return True
    else:
        return False

# The MIT License
#
# Copyright (c) 2010 Daniel R. Craig
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
# 
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
# 
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.

API_URL = 'https://api.pingdom.com/api/2.0/'

class Pingdom(object):
    def __init__(self, url=API_URL, username=None, password=None, appkey=None):
        self.url = url
        self.appkey= appkey
        password_manager = urllib2.HTTPPasswordMgrWithDefaultRealm()
        password_manager.add_password(None, url, username, password)
        auth_handler = urllib2.HTTPBasicAuthHandler(password_manager)
        self.opener = urllib2.build_opener(auth_handler)
        
    class RequestWithMethod(urllib2.Request):
        def __init__(self, url, data=None, headers={},
                     origin_req_host=None, unverifiable=False, http_method=None):
           urllib2.Request.__init__(self, url, data, headers, origin_req_host, unverifiable)
           if http_method:
               self.method = http_method

        def get_method(self):
            if self.method:
                return self.method
            return urllib2.Request.get_method(self)
    
    def method(self, url, method="GET", parameters=None):
        if parameters:
            data = urlencode(parameters)
        else:
            data = None
        method_url = urljoin(self.url, url)
        if method == "GET" and data:
            method_url = method_url+'?'+data
            req = self.RequestWithMethod(method_url, http_method=method, data=None)
        else:
            req = self.RequestWithMethod(method_url, http_method=method, data=data)
        req.add_header('App-Key', self.appkey)
        response = self.opener.open(req).read()
        return json.loads(response)
        
    def check_by_name(self, name):
        resp = self.method('checks')
        checks = [check for check in resp['checks'] if check['name'] == name]
        return checks
        
    def check_status(self, name):
        checks = self.check_by_name(name)
        for check in checks:
            print('%s hello %s') % (check['name'], check['status'])

    def modify_check(self, name, parameters={}):
        checks = self.check_by_name(name)
        if not checks:
            print("No checks for %s") % name
            return
        for check in checks:
            id_ = check['id']
            response = self.method('checks/%s/' % id_, method='PUT', parameters=parameters)
            print(response['message'])
            
    def pause_check(self, name):
        self.modify_check(name, parameters={'paused': True})
        self.check_status(name)
        
    def unpause_check(self, name):
        self.modify_check(name, parameters={'paused': False})
        self.check_status(name)
        
    def avg_response(self, check_id, minutes_back=None, country=None):
        parameters = {}
        if minutes_back:
            from_time = "%.0f" % (time.time() - 60*minutes_back)
            parameters['from'] = from_time
        if country:
            parameters['bycountry'] = 'true'

        summary = self.method('summary.average/%s/' % check_id, parameters=parameters)['summary']
        avgresponse = summary['responsetime']['avgresponse']

        if country:
            response_time = None
            for c in avgresponse:
                countryiso = c['countryiso']
                countryresponse = c['avgresponse']
                if countryiso == country:
                    response_time = countryresponse
        else:
           response_time = avgresponse
        return response_time

# AWS Lambda Pingdom cache

An AWS Lambda function, written in Python, to create a small cache of information from the Pingom API and regularly store it in a DynamoDB database table. The intention is to call this function every minute or every 5 minutes.

More information about Pingdom is available from https://pingdom.com/. More information about the Pingdom API is at https://www.pingdom.com/resources/api.

By default, the DynamoDB table is called 'pingdom-cache'.

The fields stored in the table are as follows:

| Field | Description |
+-------+-------------+
| id | |
| availability1day | |
| availability1month | |
| availability1week | |
| availability3months | |
| cacheupdate | |
| lasterrorend | |
| lasterrorstart | |
| lasterrortime | |
| name | |
| status | |
| type | |

Note that the function includes the https://github.com/drcraig/python-restful-pingdom module written by @drcraig (see https://github.com/drcraig).

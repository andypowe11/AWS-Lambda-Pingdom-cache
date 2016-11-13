# AWS Lambda Pingdom cache

An AWS Lambda function, written in Python, to create a small cache of information from the Pingom API and regularly store it in a DynamoDB database table. The intention is to call this function every minute or every 5 minutes via a CloudWatch Events Schedule.

More information about Pingdom is available from https://pingdom.com/. More information about the Pingdom API is at https://www.pingdom.com/resources/api.

Edit the 4 variables at the top of the function to include your Pindom API credentials. By default, the DynamoDB table is called 'pingdom-cache'.

The fields stored in the table are as follows:

| Field | Description |
|-------|-------------|
| id | Identifier of the Pingdom check |
| availability1day | Availability over the last 24 hours (stored as an integer between 0 and 1000, i.e. 99.95% is stored as 9995) |
| availability1month | Availability over the past 30 days (see above) |
| availability1week | Availability over the past 7 days (see above) |
| availability3months | Availability over the past 90 days (see above) |
| cacheupdate | Time of last cache update (stored as seconds since the epoch) |
| lasterrorend | Time that the last error condition ended (see above) |
| lasterrorstart | Time that the last error condition started (see above) |
| name | Name of the Pingdom check |
| status | 'up', 'down' or 'unknown' |
| type | 'customer', 'external' or 'internal' (depending on presence of tags) |

Note that this function includes a verbatim copy of the https://github.com/drcraig/python-restful-pingdom module written by @drcraig (see https://github.com/drcraig).

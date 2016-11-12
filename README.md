# AWS Lambda Pingdom cache

An AWS Lambda function to create a small cache of information from the Pingom API and store it in a DynamoDB database.

More information about Pingdom is available from https://pingdom.com/

By default, the DynamoDB table is called 'pingdom-cache'.

The fields stored in the table are as follows:

- id
- availability1day
- availability1month
- availability1week
- availability3months
- cacheupdate
- lasterrorend
- lasterrorstart
- lasterrortime
- name
- status
- type

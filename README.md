# Zimbra Admin Api Javascript

## Table of Contents
- [Example](#example)
- [Install](#install)
- [Callback](#callback)
- [Errors](#errors)
- [Zimbra Resources](#zimbra-resources)
- [Common Functions](#common-functions)
- [Server Operations](#server-operations)
- [Batch Request Functions](#batch-request-functions)
- [Creating Resources](#creating-resources)
- [Modify Resources](#modify-resources)
- [Remove Resources](#remove-resources)
- [Accounts](#accounts)
- [Cos](#cos)
- [Domains](#domains)
- [Distribution Lists](#distribution-lists)
- [Contributing](#contributing)


## Example

First, instantiate the wrapper.

### As an Admin Account
```javascript
var client = new ZimbraAdminApi({
  'url': 'http://zimbra.zboxapp.dev:8000/service/admin/soap',
  'user': 'admin@zboxapp.dev',
  'password':'12345678'
});

var callback = function(err, data) {
  if (err) return console.log(err);
  console.log(data);
};

client.getAllDomains(callback);

ZimbraAdminApi.version();
// "version"
```

### As a Normal Account
You must use the correct `url`.

```javascript
var client = new ZimbraAdminApi({
  'url': 'http://zimbra.zboxapp.dev:8000/service/soap',
  'user': 'normal_user@zboxapp.dev',
  'password':'12345678',
  'isAdmin': false
});
```

## Install

```
$ npm install --save zimbra-admin-api-js
```

## Callback
You have to pass a `callback` to all the functions, that receives to params:

1. `error`, if any
2. `data`, if any

For this documentations `callback` will always be:

```javascript
function(err, data) {
  if (err) return console.log(err);
  console.log(data);
};
```

## Errors
If Zimbra returns an Error, the library returns an `Error` Object with the Zimbra Error
information. For example, if you look for a non existing `Domain`:

```javascript
client.getDomain('example.com', callback);

// Error: {status: 500, title: "Internal Server Error", extra: Object}
// Error.extra: {
//   code: "account.NO_SUCH_DOMAIN",
//   reason: "no such domain: example.com"
// }
```

## Zimbra Resources
Zimbra Resources are the things you can manage, like:

* `Accounts`, the email users,
* `Domains`,
* `Distribution Lists`,
* `CoS`, Class of services
* `Servers`, Zimbra servers


## Common Functions
This are similar functions that you can call for all the `Resources`, so we grouped here
for brevity:

### Get a Resource
You can use the resource `name` or `zimbraId`:

```javascript
client.getAccount('account@domain.com', callback);
// Account {name: "admin@domain.com", id: "eda93f93-ba26-4344-8ae0-1d03964b612a", attrs: Object}

client.getAccount('eda93f93-ba26-4344-8ae0-1d03964b612a', callback);
// Account {name: "admin@domain.com", id: "eda93f93-ba26-4344-8ae0-1d03964b612a", attrs: Object}


client.getDomain('domain.com', callback);
// Domain {name: "domain.com", id: "cc0fd82b-7833-4de2-8954-88eb97fb81e9", attrs: Object}

client.getDistributionList('list@domain.com', callback);
// DistributionList {name: "list@domain.com", id: "747972ab-a410-4f17-8d5e-db7be21d75e9", attrs: Object, members: Array[4]}
```

A successful response will always return a `Object` named after the `Resource` your are requesting.


### GetAll and Search
You have the following functions:

* `getAllAccounts(query_object, callback)`,
* `getAllDomains(query_object, callback)`,
* `getAllDistributionLists(query_object, callback)`,

`query_object` is an **optional** `Object` that accept the following attributes:

* `query`: An LDAP query or null for everything,
* `maxResults`: Maximum results that the backend will attempt to fetch from the directory before
returning an `account.TOO_MANY_SEARCH_RESULTS` error.,
* `limit`: the maximum number of accounts to return ,
* `offset`: The starting offset (0, 25, etc),
* `domain`: The domain name to limit the search to,
* `sortBy`: Name of attribute to sort on. Default is the account name.,
* `sortAscending`: Whether to sort in ascending order. Default is 1 (true)
* `countOnly`: Whether response should be count only. Default is 0 (false),
* `attrs`: Comma separated list of attributes to ask for


### Result as Object
If you need to get the result as an Object with the resource `id` or `name` as the Key
of the object you need to initialize the Api like this:

```javascript
var client = new ZimbraAdminApi({
  'url': 'http://zimbra.zboxapp.dev:8000/service/admin/soap',
  'user': 'admin@zboxapp.dev',
  'password':'12345678',
  'arrayAsObject': true,
  'arrayAsObjectKey': 'name' // By default is 'id';
});

var callback = function(err, data) {
  if (err) return console.log(err);
  console.log(data);
};

client.getAllDomains(callback);
// Object {total: 261, more: false, domain: Object} <== Object!!
```

#### Examples

##### 1. Get All Accounts without a query_object

```javascript
client.getAllAccounts(callback);
// Object {total: 261, more: false, account: Array[261]}
```

The **Result Object** has the following information:

* `total`: The total quantity of resources that you _request_ can return,
* `account`, An array with all the `Accounts` objects,
* `more`: `true` if there are more results that.

##### 2. Get All Accounts with limit and offset
This is useful if you are doing pagination.

```javascript
var query_object = { limit: 10, offset: 2 }
client.getAllAccounts(callback);
// Object {total: 261, more: true, account: Array[10]}
```

##### 3. Get All DistributionList for the `example.com` Domain

```javascript
var query_object = { domain: 'example.com' }
client.getAllDistributionLists(query_object, callback);
// Object {total: 6, more: false, dl: Array[6]}
```

##### 4. Get All Accounts with an email containing 'basic'

```javascript
var query_object = { query: 'mail=*basic*' }
client.getAllAccounts(query_object, callback);
// Object {total: 29, more: false, account: Array[29]}
```

## Server Operations

### Backup
Do a backup `<account>` elements are required when `method=full` and server is running in standard backup mode. If server is running in auto-grouped backup mode, omit the account list in full backup request to trigger auto-grouped backup. If account list is specified, only those accounts will be backed up.

Full documentation: https://files.zimbra.com/docs/soap_api/8.7.0/api-reference/zimbraAdmin/Backup.html

The first param is the `Mailbox Server`. You need direct access to the `7071` port on this server.

```javascript
const backupRequest = {blobs: 'exclude', secondaryBlobs: 'exclude', searchIndex: 'exclude'};
const accounts = ['account2@example.com', 'account1@example.com'];
api.backup("localhost", backupRequest, null, accounts, callback);
// {label: "full-20160830.222823.315"}
```

### Get All Volumes
Get All Volumes from the server. [This link](https://files.zimbra.com/docs/soap_api/8.7.0/api-reference/zimbraAdmin/GetAllVolumes.html) has full documentation

The `server` param is the `hostname` or `ip address` of the Mailbox Server. You need direct access to the `7071` port on this server.

```javascript
api.getAllVolumes("localhost", callback);
// { message1:
//    { id: 1,
//      name: 'message1',
//      type: 1,
//      compressBlobs: false,
//      compressionThreshold: 4096,
//      mgbits: 8,
//      mbits: 12,
//      fgbits: 8,
//      fbits: 12,
//      rootpath: '/opt/zimbra/store',
//      isCurrent: true },
//   index1:
//    { id: 2,
//      name: 'index1',
//      type: 10,
//      compressBlobs: false,
//      compressionThreshold: 4096,
//      mgbits: 8,
//      mbits: 12,
//      fgbits: 8,
//      fbits: 12,
//      rootpath: '/opt/zimbra/index',
//      isCurrent: true },
// }
```

### Move Blobs
Moves blobs between volumes. Unlike `HsmRequest`, this request is synchronous, and reads parameters from the request attributes instead of `zimbraHsmPolicy`.

Takes the following parameters:

* `server`, IP or hostname of the mailbox server. You need direct access to the `7071` port on this server,
* `request_object`, Object with attributes to make the request.

The `request_object` has the following attributes:

* `types`: Comma separated list of search types. Legal values are: `conversation|message|contact|appointment|task|wiki|document`,
* `sourceVolumeIds`: A comma separated list of source volume IDs
* `destVolumeId`: Destination volume ID
* `maxBytes`: Limit for the total number of bytes of data to move. Blob move will abort if this threshold is exceeded.
* `query`: An _optional_ query to move only Blobs that match this query. For query syntax check [this documentation](https://wiki.zimbra.com/wiki/Zimbra_Web_Client_Search_Tips).

```javascript
const request_object = {
  types: 'all', sourceVolumeIds: '1',
  destVolumeId: '3', maxBytes: 100000
};
api.moveBlobs("192.168.0.272", request_object, callback);
// {
//  numBlobsMoved: 0,
//  numBytesMoved: 0,
//  totalMailboxes: 376
// }
```

## Batch Request Functions
With `BatchRequest` you can ask Zimbra to run multiple requests in just one call, and get
the result in just one answer.

Every function here works for `BatchRequest` if you do not pass a `callback`. For example:

```javascript
var allAccounts = client.getAllAccounts();
var allDomains = client.getAllDomains();
client.makeBatchRequest([allAccounts, allDomains], callback);
// Object {SearchDirectoryResponse: Array[2], _jsns: "urn:zimbra"}
// SearchDirectoryResponse[0].account, SearchDirectoryResponse[1].domain

client.makeBatchRequest([allAccounts, allDomains], callback, {onError: 'continue'});
// By default is {onError: 'stop'}
```


### Count Accounts for several Domains
Pass an array of domains ids or names and you get back an array of `countAccounts` responses
objects. The response arrays has the same order of the request array:

```javascript
var domains = ['zboxapp.com', 'example.com', 'zboxnow.com'];
client.batchCountAccounts(domains, callback);
// [Object, Object];
```

## Creating Resources
The methods are:

* `createAccount('email_address', password, zimbra_attributes, callback)`,
* `createDomain('domain_name', zimbra_attributes, callback)`,
* `createDistributionList('email_address', zimbra_attributes, callback)`


#### Examples

##### 1. Create an account
Always have to pass an `email_address` and a `password`:

```javascript
var zimbra_attributes = {};
client.createAccount('user1@example.com', 'SuP3rS3cur3P4ss', zimbra_attributes, callback);
// Account {name: "user1@example.com", id: "1919c856-08cc-43c9-b927-0c4cf88f50c7", attrs: Object}
```

We are making `zimbra_attributes` and empty object, because we are not passing any attributes.
If everything goes OK you get the created Object as a result.

##### 2. Create an account with a invalid Email Address
Check the *space* between `user` and `1@example.com`

```javascript
var zimbra_attributes = {};
client.createAccount('user 1@example.com', 'SuP3rS3cur3P4ss', zimbra_attributes, callback);
// Error {status: 500, title: "Internal Server Error", extra: Object}
// Error.extra {
//  code: "service.INVALID_REQUEST",
//  reason: "invalid request: invalid email address"
// }
```

You get an `Error` Object with the reason of the failure.

##### 3. Create an Account with some attributes
`zimbra_attributes` must be an `Object`, that can be empty, that should have valid Zimbra attributes
for the `Resource` being created.

In this example we are creating an account with the following attributes:

* First Name (`givenName`),
* Last Name (`sn`), and
* A Mail Quota of `50GB` (`zimbraMailQuota`)

```javascript
var zimbra_attributes = {
  givenName: 'John',
  sn: 'Smith',
  zimbraMailQuota: 53687091200
}
client.createAccount('user@example.com', 'SuP3rS3cur3P4ss', zimbra_attributes, callback);
// Account {name: "user@example.com", id: "1919c856-08cc-43c9-b927-0c4cf88f50c7", attrs: Object}
```

## Modify Resources
For updating resources **you have** to use the `ZimbraId`

* `modifyAccount(zimbra_id, attributes, callback)`,
* `modifyDomain(zimbra_id, attributes, callback)`,
* `modifyDistributionList(zimbra_id, attributes, callback)`

For example:

```javascript
// Attributes to modify
var zimbra_attributes = {
  givenName: 'Tom',
  sn: 'Hanks'
}

// user@example.com
var zimbraId = "1919c856-08cc-43c9-b927-0c4cf88f50c7";

client.modifyAccount(zimbraId, zimbra_attributes, callback);
// Account {name: "user@example.com", id: "1919c856-08cc-43c9-b927-0c4cf88f50c7", attrs: Object}
// attrs.sn = 'Hanks'
// attrs.givenName = 'Tom'
```

## Remove Resources
For deleting resources **you have** to use the `ZimbraId`

* `removeAccount(zimbra_id, callback)`,
* `removeDomain(zimbra_id, callback)`,
* `removeDistributionList(zimbra_id, callback)`

For example:

```javascript
// user@example.com
var zimbraId = "1919c856-08cc-43c9-b927-0c4cf88f50c7";
client.removeAccount(zimbraId, callback);
```

* If everything goes OK you receive **nothing** as result.
* You **can't delete** a `Domain` that is not empty. If it has any `Account` or `DistributionList`, You have to delete those first.

## Accounts

### Set Password

```javascript
account.setPassword(password, callback);
// {} if OK
// Error if not OK
```

### Enable and Disable Archive
**Only Zimbra Network Edition**

You **must** pass a `COS Name` or `CosID` as firt params

```javascript
account.enableArchiving('default', callback);
// Account {}
// account.archiveEnabled === true;

account.disableArchiving(callback);
// Account {}
// account.archiveEnabled === false;
```

### Get Account Membership
Get distribution lists an account is a member of.

```javascript
client.getAccountMembership(account, callback);
// [DistributionList, DistributionList, ...]

// Or as a method of the account
account.getAccountMembership(callback);
// [DistributionList, DistributionList, ...]
```

### Get Mailbox
```javascript
account.getMailbox(callback);
// Object { mbxid: Mailbox ID, size: Quota Used}
//
```

### Get Mailbox Size
```javascript
account.getMailboxSize(callback);
// Returns a Integer represeting Bytes
//
```

### Rename

```javascript
account.rename('new_name@example.com', callback);
// account Object
```

### Account Alias
The `alias` **must** be an email with `Domain` in Zimbra.

```javascript
account.addAccountAlias(alias, callback);
// Empty {} if everything goes Ok

account.removeAccountAlias(alias, callback);
// Empty {} if everything goes Ok
```

### View Mail Path
This return an `URL PATH` to access the account Webmail as an administrator.
The first parameter is the `lifetime` of the Token in seconds.

```javascript
client.getAccountViewMailPath(account.name, 3600, callback);
// OR
account.viewMailPath(3600, callback);
// /service/preauth?authtoken=0_8c671f3146....&isredirect=1&adminPreAuth=1
```

### Cos Name
The account only has the Id of the Cos, `zimbraCOSId`, but not the name. To get the name you call `zimbraCosName` on the Account:

```javascript
// account is a Account, you got it from client.getAccount....
account.cosName(callback);
// professional

// An account without Cos
no_cos_account.cosName(callback);
// null
```

## Cos
This are functions especifics to `Cos`.

### Get All Cos

```javascript
client.getAllCos(callback);
```

## Create / Delete Cos
To create a Cos
```javascript
//Simple, without attributes
var attributes = {};
client.createCos("cos_name", attributes, callback);
// With attributes
var attributes = {'zimbraFeatureContactsEnabled' : 'FALSE'};
client.createCos("cos_name", attributes, callback)
```

To delete a Cos
```javascript
client.deleteCos("cos_Id", callback)
```

## Get Cos

```javascript
client.getCos(name|id, callback);
```

## Modify Cos
```javascript
var attributes = {'zimbraDumpsterEnabled' : 'TRUE'};
client.modifyCos("cos_Id", attributes, callback);
```

## Rename Cos
```javascript
var newName = "basicv2"
client.renameCos("cos_Id", newName, callback);
```

## Copy Cos
To copy a Cos with other name
```javascript
var newCos = "Pro2";
client.copyCos(nameCos|idCos, newCos, callback);
```

## Domains
This are functions especifics to `Domains`.

### isAliasDomain & masterDomainName
These are `properties`, **not functions**.

* `isAliasDomain`, return if a Domain is an Alias Domain.
* `masterDomainName`, return the name of the master domain.

```
domain.isAliasDomain
// true || false

domain.masterDomainName
// example.com
```

### Count Accounts
Count number of accounts by `CoS` in a domain.

```javascript
client.countAccounts('example.com', callback);

// Object { premium: Object, professional: Object}
// premium: {
//   id: _COSId_,
//   used: 50
// }
}
```

If you have a `Domain` you can call `countAccounts(callback)` on it and it will returns the **Limit of Accounts** for the `Domain`:

```javascript
// domain is a Domain, you got it from client.getDomain....
domain.countAccounts(callback);
// Object { premium: Object, professional: Object}
// premium: {
//   id: _COSId_,
//   used: 50,
//   limit: 28
// }
}
```

If the `Domain` is empty, no 'Accounts', the result will be a `{}`.

### CheckDomainMXRecord

```javascript
client.checkDomainMxRecord(domain.name, callback);
// OR
domain.checkMxRecord(callback);
// Object {entry: "5 mailcleaner.zboxapp.com.", code: "Failed",
// message: "Domain is configured to use SMTP host: zimbra.zboxapp.dev. None of the MX records match this name."}
```

### Add / Remove Admin

To add or remove a `Domain Admin` you **must** use the `account.id`.
You should also specify the `coses` the `Domain Admin` can assign to the accounts of his domains.

```javascript
const coses = ['default', 'test', 'professional'];
api.addDomainAdmin(domain.name, account.id, coses, callback);
// OR
domain.addAdmin(account.id, coses, callback);
// {} if Success

api.removeDomainAdmin(domain.name, account.id, coses, callback);
// OR
domain.removeAdmin(account.id, coses, callback);
// {} if Success
```

### Domain Admins
Return an Array of the Domain Admins `Accounts`.

```javascript
// domain is a Domain, you got it from client.getDomain....
api.getDomainAdmins(domain.name, callback);
// OR
domain.getAdmins(callback);
// [Account, Account]
```

### Distribution Lists
Return an Array of the Domain `DistributionList`s.

```javascript
// domain is a Domain, you got it from client.getDomain....
domain.getAllDistributionLists(callback);
// [DistributionList, DistributionList]
```

## Distribution Lists

### Rename

```javascript
dl.rename('new_name@example.com', callback);
// dl Object
```

### Add / Remove Members

```javascript
dl.addMembers('new_member@example.com', callback);
// {} if Success

dl.addMembers(['1@example.com', '2@example.com'], callback);

dl.removeMembers('new_member@example.com', callback);
// {} if Success

dl.removeMembers(['1@example.com', '2@example.com'], callback);
// Return Error if any of the emails isn't a member
```

### Add / Remove Owner

```javascript
client.addDistributionListOwner(dl.name, 'new_member@example.com', callback);
// OR
dl.addOwner('new_member@example.com', callback);
// {} if Success

client.removeDistributionListOwner(dl.name, 'new_member@example.com', callback);
// OR
dl.removeOwner('new_member@example.com', callback);
// {} if Success
```

### Get Owners
Owners are the Zimbra emails addresses that are allowed to send emails to the `DL`.
If a `DL` has at least one `Owener` is a **Private DL**.

```javascript
client.getDistributionListOwners(dl.name, callback);
// OR
dl.getOwners(callback);
// Array of Objects
// {name: 'email_address', id: 'ZimbraId', type: 'usr|grp'}
```

### Add / Remove Alias
To set alias at `DL` .
```javascript
client.addDistributionListAlias(dl.id, alias, callback);
```

To delete alias of `DL`.
```javascript
api.removeDistributionListAlias(dl.id, alias, callback);
```



## Contributing

 1. **Fork** the repo on GitHub
 2. **Clone** the project to your own machine
 3. **Commit** changes to your own branch
 4. **Push** your work back up to your fork
 5. Submit a **Pull request** so that we can review your changes

NOTE: Be sure to merge the latest from "upstream" before making a pull request!

### Developer Machine
This repo include a Vagrantfile that setups a VM ready for development. This VM provision a Zimbra server with all the resources needed. So you need to install [Vagrant](https://www.vagrantup.com) if you haven't.

Also you need to install [Ansible](https://www.ansible.com) because we use it to provision the VM.

Once you have everything in place just run:

```
$ vagrant up
$ vagrant provision
```

And wait for it to finish.

### Test
You must write test for every feature that you add, otherwise we wont accept your Pull Request.

We are using [Mocha](https://mochajs.org) and [Chai](http://chaijs.com) for testing. To run the test just execute:

```
$ npm run test
```

Also we have Travis-CI that run the test for every Pull Request.

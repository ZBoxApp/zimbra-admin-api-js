# Zimbra Admin Api Javascript

## Table of Contents
- [Example](#example)
- [Install](#install)
- [Callback](#callback)
- [Errors](#errors)
- [Zimbra Resources](#zimbra-resources)
- [Common Functions](#common-functions)
- [Batch Request Functions](#batch-request-functions)
- [Creating Resources](#creating-resources)
- [Modify Resources](#modify-resources)
- [Remove Resources](#remove-resources)
- [Accounts](#accounts)
- [Cos](#cos)
- [Domains](#domains)
- [Distribution Lists](#distribution-lists)


## Example

First, instantiate the wrapper.
```javascript
var zimbraApi = new ZimbraAdminApi({
  'url': 'http://zimbra.zboxapp.dev:8000/service/admin/soap',
  'user': 'admin@zboxapp.dev',
  'password':'12345678'
});

var callback = function(err, data) {
  if (err) return console.log(err);
  console.log(data);
};

zimbraApi.getAllDomains(callback);

ZimbraAdminApi.version();
// "version"
```

## Install
**TODO**

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
api.getDomain('example.com', callback);

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
zimbraApi.getAccount('account@domain.com', callback);
// Account {name: "admin@domain.com", id: "eda93f93-ba26-4344-8ae0-1d03964b612a", attrs: Object}

zimbraApi.getAccount('eda93f93-ba26-4344-8ae0-1d03964b612a', callback);
// Account {name: "admin@domain.com", id: "eda93f93-ba26-4344-8ae0-1d03964b612a", attrs: Object}


zimbraApi.getDomain('domain.com', callback);
// Domain {name: "domain.com", id: "cc0fd82b-7833-4de2-8954-88eb97fb81e9", attrs: Object}

zimbraApi.getDistributionList('list@domain.com', callback);
// DistributionList {name: "list@domain.com", id: "747972ab-a410-4f17-8d5e-db7be21d75e9", attrs: Object, members: Array[4]}
```

A successful response will always return a `Object` named after the `Resource` your are requesting.


### GetAll and Search
You have the following functions:

* `getAllAccounts(callback, query_object)`,
* `getAllDomains(callback, query_object)`,
* `getAllDistributionLists(callback, query_object)`,

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

#### Examples

##### 1. Get All Accounts without a query_object

```javascript
zimbraApi.getAllAccounts(callback);
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
zimbraApi.getAllAccounts(callback);
// Object {total: 261, more: true, account: Array[10]}
```

##### 3. Get All DistributionList for the `example.com` Domain

```javascript
var query_object = { domain: 'example.com' }
zimbraApi.getAllDistributionLists(callback, query_object);
// Object {total: 6, more: false, dl: Array[6]}
```

##### 4. Get All Accounts with an email containing 'basic'

```javascript
var query_object = { query: 'mail=*basic*' }
zimbraApi.getAllAccounts(callback, query_object);
// Object {total: 29, more: false, account: Array[29]}
```

## Batch Request Functions
With `BatchRequest` you can ask Zimbra to run multiple requests in just one call, and get
the result in just one answer.

Every function here works for `BatchRequest` if you do not pass a `callback`. For example:

```javascript
var allAccounts = zimbraApi.getAllAccounts();
var allDomains = zimbraApi.getAllDomains();
zimbraApi.makeBatchRequest([allAccounts, allDomains], callback);
// Object {SearchDirectoryResponse: Array[2], _jsns: "urn:zimbra"}
// SearchDirectoryResponse[0].account, SearchDirectoryResponse[1].domain

zimbraApi.makeBatchRequest([allAccounts, allDomains], callback, {onError: 'continue'});
// By default is {onError: 'stop'}
```


### Count Accounts for several Domains
Pass an array of domains ids or names and you get back an array of `countAccounts` responses
objects. The response arrays has the same order of the request array:

```javascript
var domains = ['zboxapp.com', 'example.com', 'zboxnow.com'];
zimbraApi.batchCountAccounts(domains, callback);
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
zimbraApi.createAccount('user1@example.com', 'SuP3rS3cur3P4ss', zimbra_attributes, callback);
// Account {name: "user1@example.com", id: "1919c856-08cc-43c9-b927-0c4cf88f50c7", attrs: Object}
```

We are making `zimbra_attributes` and empty object, because we are not passing any attributes.
If everything goes OK you get the created Object as a result.

##### 2. Create an account with a invalid Email Address
Check the *space* between `user` and `1@example.com`

```javascript
var zimbra_attributes = {};
zimbraApi.createAccount('user 1@example.com', 'SuP3rS3cur3P4ss', zimbra_attributes, callback);
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
zimbraApi.createAccount('user@example.com', 'SuP3rS3cur3P4ss', zimbra_attributes, callback);
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

zimbraApi.modifyAccount(zimbraId, zimbra_attributes, callback);
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
zimbraApi.removeAccount(zimbraId, callback);
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

`Enable` can take the following options:

* **create**: `(0|1)` if the archive mailbox should be created. Default its 1, create.
* **name**: Name of the archive mailbox, if empty the template will be used.
* **cos_id**: Name or ID of the COS to assign to the archive mailbox.
* **password**: password of the archive mailbox.
* **attributes**.


```javascript
account.enableArchive({ cos_id: 'default' }, callback);
// {}

account.disableArchive(callback);
// {}
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
account.viewMailPath(3600, callback);
// /service/preauth?authtoken=0_8c671f3146....&isredirect=1&adminPreAuth=1
```

### Cos Name
The account only has the Id of the Cos, `zimbraCOSId`, but not the name. To get the name you call `zimbraCosName` on the Account:

```javascript
// account is a Account, you got it from zimbraApi.getAccount....
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
zimbraApi.getAllCos(callback);
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
zimbraApi.countAccounts('example.com', callback);

// Object { premium: Object, professional: Object}
// premium: {
//   id: _COSId_,
//   used: 50
// }
}
```

If you have a `Domain` you can call `countAccounts(callback)` on it and it will returns the **Limit of Accounts** for the `Domain`:

```javascript
// domain is a Domain, you got it from zimbraApi.getDomain....
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
domain.checkMxRecord(callback);
// Object {entry: "5 mailcleaner.zboxapp.com.", code: "Failed",
// message: "Domain is configured to use SMTP host: zimbra.zboxapp.dev. None of the MX records match this name."}
```

### Add / Remove Admin

To add or remove a `Domain Admin` you **must** use the `account.id`.
You should also specify the `coses` the `Domain Admin` can assign to the accounts of his domains.

```javascript
const coses = ['default', 'test', 'professional'];
domain.addAdmin(account.id, coses, callback);
// {} if Success

domain.removeAdmin(account.id, coses, callback);
// {} if Success
```

### Domain Admins
Return an Array of the Domain Admins `Accounts`.

```javascript
// domain is a Domain, you got it from zimbraApi.getDomain....
domain.getAdmins(callback);
// [Account, Account]
```

### Distribution Lists
Return an Array of the Domain `DistributionList`s.

```javascript
// domain is a Domain, you got it from zimbraApi.getDomain....
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
dl.addOwner('new_member@example.com', callback);
// {} if Success

dl.removeOwner('new_member@example.com', callback);
// {} if Success
```

### Get Owners
Owners are the Zimbra emails addresses that are allowed to send emails to the `DL`.
If a `DL` has at least one `Owener` is a **Private DL**.

```javascript
dl.getOwners(callback);
// Array of Objects
// {name: 'email_address', id: 'ZimbraId', type: 'usr|grp'}
```

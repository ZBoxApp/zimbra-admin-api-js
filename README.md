###### DRAFT ....

## Como se usa

First, instantiate the wrapper.
```javascript
var zimbraApi = new ZimbraAdminApi({
  'url': 'http://zimbra.zboxapp.dev:8000/service/admin/soap',
  'user': 'admin@zboxapp.dev',
  'password':'12345678'
});
```

Here you see how to get basic information using a function like `getAllDomains`:

```javascript
zimbraApi.getAllDomains(function(err, data){
  if (err) return console.log(err);
  data.forEach(function(v){
    console.log(v.id + ' ' + v.name);
  })
});
```

Here you see how to get basic information using a function like `getAllAccounts`:

```javascript
zimbraApi.getAllAccounts(function(err, data){
  if (err) return console.log(err);
  data.forEach(function(v){
    console.log(v.id + ' ' + v.name);
  })
});
```

## TODOS:

Muchas, pero ya viene.

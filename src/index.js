// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

'use strict';

var jszimbra = require('js-zimbra');
var pjson = require('../package.json');
var Dictionary = require('./utils/dictionary.js');
var ResponseParser = require('./utils/response_parser.js');
var ErrorBuilder = require('./zimbra/error.js');
var entries = require ('object.entries');

// Hack Para que Object tenga entries
if (!Object.entries) {
    entries.shim();
}

// TODO: To many parseResponse types
class ZimbraAdminApi {
  constructor(auth_object) {
    this.url = auth_object.url;
    this.user = auth_object.user;
    this.password = auth_object.password;
    this.isAdmin = !auth_object.isAdmin ? false : true;
    this._client = new jszimbra.Communication({url: auth_object.url});
    this.dictionary = new Dictionary();
    this.arrayAsObject = auth_object.arrayAsObject || false;
    this.arrayAsObjectKey = auth_object.arrayAsObjectKey || 'id';
  }

  static version() {
    return pjson.version;
  }

  version() {
    return ZimbraAdminApi.version();
  }

  buildRequestData (request_name, callback) {
    const request_data = { };
    // TODO: Eliminar dependencia de client que se pasa a todos lados
    request_data.client = this;
    request_data.params = this.requestParams();
    request_data.params.params = {};
    request_data.request_name = request_name;
    request_data.params.name = `${request_data.request_name}Request`;
    request_data.response_name = `${request_data.request_name}Response`;
    request_data.callback = callback;
    return(request_data);
  }

  buildResourceData (name, attributes) {
    return {
      name: { '_content': name },
      a: this.dictionary.attributesToArray(attributes)
    };
  }

  set token (token) {
    this._token = token;
  }

  get token () {
    return this._token;
  }

  get client () {
    return this._client;
  }

  requestParams() {
    return { namespace: 'zimbraAdmin', params: { } };
  }

  options() {
    return this.client.options;
  }

  handleError(err) {
    return new ErrorBuilder(err);
  }

  handleResponse(_, response) {
    console.log(response);
  }

  login(callback) {
    let auth_object = {
      'username': this.user, 'secret': this.password,
      'isPassword': true, 'isAdmin': this.isAdmin
    };
    let that = this;
    this.client.auth(auth_object, function(err, response){
      that.secret = null;
      that.password = null;
      if (err) return callback(that.handleError(err));
      return (callback || that.handleResponse)(null, response);
    });
  }


  buildRequest(options) {
    options = options || {};
    let request = null;
    const that = this;
    this.client.getRequest(options, (err, req) => {
      if (err) return console.error(err);
      request = req;
    });
    return request;
  }

  makeBatchRequest(request_data_array, callback, error) {
    error = error || {onError: 'stop'}
    const that = this;
    if (request_data_array.length === 0) return;
    let request_object = this.buildRequest({isBatch: true, batchOnError: error.onError});
    request_data_array.forEach((request_data) => {
      request_object.addRequest(request_data.params, function(err, reqid){
        if (err) return that.handleError(err);
      });
    });
    this.client.send(request_object, function(err, data){
      if (err) return callback(that.handleError(err));
      ResponseParser.batchResponse(data, callback);
    });
  }

  makeRequest(request_data) {
    const that = this;
    let request_object = this.buildRequest();
    request_object.addRequest(request_data.params, function(err){
      if (err) {
        return that.handleError(err);
      }
      that.client.send(request_object, function(err, data){
        if (err) return request_data.callback(that.handleError(err));
        request_data.parse_response(data, request_data, request_data.callback);
      });
    });
  }

  performRequest(request_data) {
    // return request_data for BatchRequest if no callback present
    if (typeof request_data.callback !== 'function') return request_data;
    if (this.client.token) {
      if (request_data.batch) return this.makeBatchRequest(request_data.requests, request_data.callback);
      this.makeRequest(request_data);
    } else {
      const that = this;
      let getCallback = function(err, response){
        if (err) return that.handleError(err);
        if (request_data.batch) return that.makeBatchRequest(request_data.requests, request_data.callback);
        that.makeRequest(request_data)
      };
      this.login(getCallback);
    }
  }

  checkDomainMxRecord(domain, callback) {
    const request_data = this.buildRequestData('CheckDomainMXRecord', callback);
    request_data.parse_response = ResponseParser.checkDomainMxRecordResponse;
    request_data.params.params.domain = {
      'by': this.dictionary.byIdOrName(domain),
      '_content': domain
    };
    return this.performRequest(request_data);
  }

  create(resource, resource_data, callback){
    const request_data = this.buildRequestData(`Create${resource}`, callback);
    request_data.resource = resource;
    request_data.parse_response = ResponseParser.getResponse;
    request_data.params.params = resource_data;
    return this.performRequest(request_data);
  }

  remove(resource, resource_data, callback){
    const request_data = this.buildRequestData(`Delete${resource}`, callback);
    request_data.resource = resource;
    request_data.parse_response = ResponseParser.emptyResponse;
    request_data.params.params = resource_data;
    return this.performRequest(request_data);
  }

  rename(resource, resource_data, callback) {
    const request_data = this.buildRequestData(`Rename${resource}`, callback);
    request_data.resource = resource;
    request_data.parse_response = ResponseParser.getResponse;
    request_data.params.params = resource_data;
    return this.performRequest(request_data);
  }


  modify(resource, resource_data, callback){
    const request_data = this.buildRequestData(`Modify${resource}`, callback);
    request_data.resource = resource;
    request_data.parse_response = ResponseParser.getResponse;
    request_data.params.params = resource_data;
    return this.performRequest(request_data);
  }

  get(resource, resource_identifier, callback){
    const request_data = this.buildRequestData(`Get${resource}`, callback);
    request_data.resource = resource;
    request_data.parse_response = ResponseParser.getResponse;
    let resource_name = this.dictionary.resourceResponseName(resource);
    request_data.params.params[resource_name] = {
      'by': this.dictionary.byIdOrName(resource_identifier),
      '_content': resource_identifier
    };
    return this.performRequest(request_data);
  }

  getAll(resource, callback) {
    const request_data = this.buildRequestData(`GetAll${resource}s`, callback);
    request_data.resource = resource;
    request_data.parse_response = ResponseParser.allResponse;
    return this.performRequest(request_data);
  }

  // Grant a right on a target to an individual or group grantee.
  // target_data  and grantee_data are both objects like:
  // {
  //  type: (account|cos|dl|domain),
  //  identifier: (name or zimbraId)
  // }
  // Right {
  //  deny: 0|1,
  //  canDelegate: 0|1,
  //  disinheritSubGroups: 0|1,
  //  subDomain: 0|1,
  //  _content: <RightName>
  // }

  grantRight(target_data, grantee_data, right, callback) {
    const request_data = this.buildRequestData('GrantRight', callback);
    const target_grantee = this.dictionary.buildTargetGrantee(target_data, grantee_data);
    const target = target_grantee[0];
    const grantee = target_grantee[1];
    request_data.parse_response = ResponseParser.emptyResponse;
    request_data.params.params.grantee = grantee;
    request_data.params.params.target = target;
    request_data.params.params.right = right;
    return this.performRequest(request_data);
  }

  // Specific functions

  addAccountAlias(account_id, alias, callback) {
    const request_data = this.buildRequestData('AddAccountAlias', callback);
    request_data.parse_response = ResponseParser.emptyResponse;
    request_data.params.params = { 'id': account_id, 'alias': alias };
    return this.performRequest(request_data);
  }

  addDistributionListAlias(dl_id, alias, callback) {
    const request_data = this.buildRequestData('AddDistributionListAlias', callback);
    request_data.parse_response = ResponseParser.emptyResponse;
    request_data.params.params = { 'id': dl_id, 'alias': alias };
    return this.performRequest(request_data);
  }

  removeDistributionListAlias(dl_id, alias, callback) {
    const request_data = this.buildRequestData('RemoveDistributionListAlias', callback);
    request_data.parse_response = ResponseParser.emptyResponse;
    request_data.params.params = { 'id': dl_id, 'alias': alias };
    return this.performRequest(request_data);
  }

  // Add New members tos distributionlists
  // members is an array of emails
  addDistributionListMember(dl_id, members, callback) {
    const request_data = this.buildRequestData('AddDistributionListMember', callback);
    request_data.parse_response = ResponseParser.emptyResponse;
    request_data.params.params = { id: dl_id, dlm: this.dictionary.convertToZimbraArray(members) };
    return this.performRequest(request_data);
  }

  addDistributionListOwner(distributionList, ownerId, callback) {
    this.getDistributionList(distributionList, (err, dl) => {
      if (err) return callback(err);
      return dl.addOwner(ownerId, callback);
    });
  }

  addDomainAdmin(domain, account_id, coses, callback) {
    this.getDomain(domain, (err, domain) => {
      if (err) return callback(err);
      return domain.addAdmin(account_id, coses, callback);
    });
  }

  // Return a token for access an account
  // {authToken: _TOKEN_, lifetime: _miliseconds_ }
  delegateAuth(account_id, lifetime_seconds, callback) {
    const lifetime = lifetime_seconds || 3600;
    const request_data = this.buildRequestData('DelegateAuth', callback);
    const account = { by: this.dictionary.byIdOrName(account_id), _content: account_id };
    request_data.params.params.account = account;
    request_data.params.params.duration = lifetime.toString();
    request_data.parse_response = ResponseParser.delegateAuthResponse;
    return this.performRequest(request_data);
  }

  // Enable Archiving for an Account
  // options = {create: (0|1), name: 'archive_account_name', cos: _cos_id, password:}
  // Docs: https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraAdmin/EnableArchive.html
  enableArchive(account_id, options, callback) {
    const request_data = this.buildRequestData('EnableArchive', callback);
    request_data.parse_response = ResponseParser.emptyResponse;
    const account = { by: this.dictionary.byIdOrName(account_id), _content: account_id };
    const archive = {
      create: (options.create || 1),
      cos: { by: this.dictionary.byIdOrName(options.cos), '_content': options.cos }
    };
    if (options.name) archive.name = { '_content': options.name };
    if (options.password) archive.password = { '_content': options.password };
    if (options.attributes) archive.a = this.dictionary.attributesToArray(options.attributes || {});
    request_data.params.params.account = account;
    request_data.params.params.archive = archive;
    return this.performRequest(request_data);
  }

  disableArchive(account_id, callback) {
    const request_data = this.buildRequestData('DisableArchive', callback);
    request_data.parse_response = ResponseParser.emptyResponse;
    const account = { by: this.dictionary.byIdOrName(account_id), _content: account_id };
    request_data.params.params.account = account;
    return this.performRequest(request_data);
  }

  // flushData = {
  //   type: Comma separated list of cache types. e.g. from skin|locale|account|cos|domain|server|zimlet,
  //   allServers: 0|1,
  //   entry: Name or Id of the object, should be relevant to type
  // }
  flushCache(flushData, callback) {
    const request_data = this.buildRequestData('FlushCache', callback);
    request_data.parse_response = ResponseParser.emptyResponse;
    request_data.params.params = {
      cache: {
        type: flushData.type,
        allServers: (flushData.allServers || 0),
        '_content': { entry: { } }
      }
    };
    if (flushData.entry) request_data.params.params.cache._content.entry = {
      'by': this.dictionary.byIdOrName(flushData.entry),
      '_content': flushData.entry
    }
    return this.performRequest(request_data);
  }

  getAccount(identifier, callback) {
    return this.get('Account', identifier, callback);
  }

  getAccountViewMailPath(account, lifetime_seconds, callback) {
    this.getAccount(account, (err, account) => {
      if (err) return callback(err);
      return account.viewMailPath(lifetime_seconds, callback);
    });
  }


  // query_object takes this
  // {limit: INT, offset: INT}
  getDistributionListMembership(dl, query_object = {}, callback) {
    const request_data = this.buildRequestData('GetDistributionListMembership', callback);
    request_data.resource = 'dl';
    request_data.parse_response = ResponseParser.allResponse;
    // request_data.parse_response = function(data, rq, callback){ return callback(null, data.get()) };
    request_data.params.params.dl = {
      'by': this.dictionary.byIdOrName(dl),
      '_content': dl
    };
    return this.performRequest(request_data);
  };

  getDistributionListOwners(distributionList, callback) {
    this.getDistributionList(distributionList, (err, dl) => {
      if (err) return callback(err);
      return dl.getOwners(callback);
    });
  }

  // attributes debe ser un arreglo de objetos:
  // let resource_attributes = {
  //   zimbraSkinLogoURL: 'http://www.zboxapp.com',
  //   postOfficeBox: 'ZBoxApp'
  // };
  createAccount(name, password, attributes, callback) {
    const resource_data = this.buildResourceData(name, attributes);
    resource_data.password = { '_content': password };
    return this.create('Account', resource_data, callback);
  }

  createDomain(name, attributes, callback) {
    const resource_data = this.buildResourceData(name, attributes);
    return this.create('Domain', resource_data, callback);
  }

  createCos(name, attributes, callback ) {
    const resource_data = this.buildResourceData(name, attributes);
    return this.create('Cos', resource_data, callback);
  }

  getDistributionList(identifier, callback) {
    return this.get('DistributionList', identifier, callback);
  }

  createDistributionList(name, attributes, callback) {
    const resource_data = this.buildResourceData(name, attributes);
    return this.create('DistributionList', resource_data, callback);
  }

  // flushData = {
  //   type: Comma separated list of cache types. e.g. from skin|locale|account|cos|domain|server|zimlet,
  //   allServers: 0|1,
  //   entry: Name or Id of the object, should be relevant to type
  // }
  flushCache(flushData = {}, callback) {
    const request_data = this.buildRequestData('FlushCache', callback);
    request_data.parse_response = ResponseParser.emptyResponse;
    request_data.params.params = {
      cache: {
        type: flushData.type,
        allServers: (flushData.allServers || 0),
        '_content': { entry: { } }
      }
    };
    if (flushData.entry) request_data.params.params.cache._content.entry = {
      'by': this.dictionary.byIdOrName(flushData.entry),
      '_content': flushData.entry
    }
    return this.performRequest(request_data);
  }

  getAllDomains(query_object, callback) {
    if (arguments.length === 1) {
      callback = query_object;
      query_object = null;
    }
    query_object = query_object || {};
    query_object.types = 'domains';
    return this.directorySearch(query_object, callback);
  }

  getAllAccounts(query_object, callback) {
    if (arguments.length === 1) {
      callback = query_object;
      query_object = null;
    }
    query_object = query_object || {};
    query_object.types = 'accounts';
    return this.directorySearch(query_object, callback);
  }

  getAllDistributionLists(query_object, callback) {
    if (arguments.length === 1) {
      callback = query_object;
      query_object = null;
    }
    query_object = query_object || {};
    query_object.types = 'distributionlists';
    return this.directorySearch(query_object, callback);
  }

  getAllAliases(query_object, callback) {
    if (arguments.length === 1) {
      callback = query_object;
      query_object = null;
    }
    query_object = query_object || {};
    query_object.types = 'aliases';
    return this.directorySearch(query_object, callback);
  }

  getAllCos(callback) {
    const request_data = this.buildRequestData('GetAllCos', callback);
    request_data.resource = 'Cos';
    request_data.parse_response = ResponseParser.allResponse;
    return this.performRequest(request_data);
  }

  getCos(identifier, callback) {
    return this.get('Cos', identifier, callback);
  }

  getDomain(identifier, callback) {
    return this.get('Domain', identifier, callback);
  }

  getDomainAdmins(identifier, callback) {
    this.getDomain(identifier, (err, domain) => {
      if (err) return callback(err);
      return domain.getAdmins(callback);
    });
  }

  getDomainMaxAccountByCos(identifier, callback) {
    this.getDomain(identifier, (err, domain) => {
      if (err) return callback(err);
      return callback(null, domain.maxAccountsByCos());
    });
  }

  // Returns all grants on the specified target entry, or all grants granted to the specified grantee entry.
  // target_data  and grantee_data are both objects like:
  // {
  //  type: (account|cos|dl|domain),
  //  identifier: (name or zimbraId)
  // }
  getGrants(target_data, grantee_data, callback) {
    const target_grantee = this.dictionary.buildTargetGrantee(target_data, grantee_data);
    const target = target_grantee[0];
    const grantee = target_grantee[1];
    const request_data = this.buildRequestData('GetGrants', callback);
    request_data.resource = 'Grant';
    request_data.parse_response = ResponseParser.allResponse;
    request_data.params.params.grantee = grantee;
    request_data.params.params.target = target;
    return this.performRequest(request_data);
  }

  getAccountMembership(account, callback) {
    const request_data = this.buildRequestData('GetAccountMembership', callback);
    request_data.resource = 'dl';
    request_data.parse_response = ResponseParser.allResponse;
    request_data.params.params.account = {
      'by': this.dictionary.byIdOrName(account),
      '_content': account
    };
    return this.performRequest(request_data);
  };

  // Get current logged account information
  getInfo(callback) {
    const request_data = this.buildRequestData('GetInfo', callback);
    request_data.params.namespace = 'zimbraAccount';
    const that = this;
    request_data.parse_response = function(data, _, callback){
      return callback(null, data.response[0].GetInfoResponse);
    };
    return this.performRequest(request_data);
  }

  // Modify Account
  modifyAccount(zimbra_id, attributes, callback) {
    let resource_data = {
      id: zimbra_id,
      a: this.dictionary.attributesToArray(attributes)
    };
    return this.modify('Account', resource_data, callback);
  }

  // Modify Domain
  modifyDomain(zimbra_id, attributes, callback) {
    let resource_data = {
      id: zimbra_id,
      a: this.dictionary.attributesToArray(attributes)
    };
    this.modify('Domain', resource_data, callback);
  }

  // Modify DistributionList
  modifyDistributionList(zimbra_id, attributes, callback) {
    let resource_data = {
      id: zimbra_id,
      a: this.dictionary.attributesToArray(attributes)
    };
    this.modify('DistributionList', resource_data, callback);
  }

  modifyCos(id_cos, attributes, callback){
    const request_data = this.buildRequestData('ModifyCos', callback);
    request_data.parse_response = ResponseParser.emptyResponse;
    request_data.params.params = { 'id':{'_content': id_cos}, 'a': this.dictionary.attributesToArray(attributes)};
    return this.performRequest(request_data);
  }

  // Remove Account
  removeAccount(zimbra_id, callback) {
    let resource_data = { id: zimbra_id };
    return this.remove('Account', resource_data, callback);
  }

  // Remove Account Alias
  removeAccountAlias(account_id, alias, callback) {
    const request_data = this.buildRequestData('RemoveAccountAlias', callback);
    request_data.parse_response = ResponseParser.emptyResponse;
    request_data.params.params = { 'id': account_id, 'alias': alias };
    return this.performRequest(request_data);
  }

  // Remove Domain
  removeDomain(zimbra_id, callback) {
    let resource_data = { id: zimbra_id };
    return this.remove('Domain', resource_data, callback);
  }

  deleteCos(id_cos, callback){
    const request_data = this.buildRequestData('DeleteCos', callback);
    request_data.parse_response = ResponseParser.emptyResponse;
    request_data.params.params = { 'id': {'_content': id_cos}};
    return this.performRequest(request_data);
  }

  copyCos(cos, newcos, callback){
    const request_data = this.buildRequestData('CopyCos', callback);
    request_data.parse_response = ResponseParser.emptyResponse;
    request_data.params.params = { 'name': { '_content': newcos }, 'cos':{ '_content': cos, by: this.dictionary.byIdOrName(cos)}};
    return this.performRequest(request_data);
  }


  removeDomainAdmin(domain, account_id, coses, callback) {
    this.getDomain(domain, (err, domain) => {
      if (err) return callback(err);
      return domain.removeAdmin(account_id, coses, callback);
    });
  }

  // Remove DL
  removeDistributionList(zimbra_id, callback) {
    let resource_data = { id: zimbra_id };
    this.remove('DistributionList', resource_data, callback);
  }

  // Add New members tos distributionlists
  // members is one email or array of emails
  removeDistributionListMember(dl_id, members, callback) {
    const request_data = this.buildRequestData('RemoveDistributionListMember', callback);
    request_data.parse_response = ResponseParser.emptyResponse;
    request_data.params.params = { id: dl_id, dlm: this.dictionary.convertToZimbraArray(members) };
    return this.performRequest(request_data);
  }

  removeDistributionListOwner(distributionList, ownerId, callback) {
    this.getDistributionList(distributionList, (err, dl) => {
      if (err) return callback(err);
      return dl.removeOwner(ownerId, callback);
    });
  }

  renameAccount(zimbra_id, new_name, callback) {
    const resource_data = { id: zimbra_id, newName: new_name };
    return this.rename('Account', resource_data, callback);
  }

  renameDistributionList(zimbra_id, new_name, callback) {
    const resource_data = { id: zimbra_id, newName: new_name };
    return this.rename('DistributionList', resource_data, callback);
  }

  renameCos(cos_Id, new_name, callback) {
    const resource_data = { id: {'_content': cos_Id}, newName: {'_content': new_name} }
    return this.rename('Cos', resource_data, callback);
  }

  revokeRight(target_data, grantee_data, right_name, callback) {
    const target_grantee = this.dictionary.buildTargetGrantee(target_data, grantee_data);
    const target = target_grantee[0];
    const grantee = target_grantee[1];
    const request_data = this.buildRequestData('RevokeRight', callback);
    request_data.parse_response = ResponseParser.emptyResponse;
    request_data.params.params.grantee = grantee;
    request_data.params.params.target = target;
    request_data.params.params.right = { '_content': right_name };
    return this.performRequest(request_data);
  }

  // Search the Directory
  // search_object = {
  //   query: An LDAP query or null for everything,
  //   maxResults: Maximum results that the backend will attempt to fetch from the directory before returning an account.TOO_MANY_SEARCH_RESULTS error.,
  //   limit: the maximum number of accounts to return ,
  //   offset: The starting offset (0, 25, etc),
  //   domain: The domain name to limit the search to,
  //   sortBy: Name of attribute to sort on. Default is the account name.,
  //   types: Comma-separated list of types to return. Legal values are:
  //           accounts|distributionlists|aliases|resources|domains|coses
  //           (default is accounts)
  //   sortAscending: Whether to sort in ascending order. Default is 1 (true)
  //   countOnly: Whether response should be count only. Default is 0 (false),
  //   attrs: Comma separated list of attributes
  // }
  directorySearch(search_object, callback) {
    const request_data = this.buildRequestData(`SearchDirectory`, callback);
    request_data.params.params = search_object;
    request_data.parse_response = ResponseParser.searchResponse;
    return this.performRequest(request_data);
  }

  // TODO: Fucking ugly code to make it better
  // Count Accounts
  // Count number of accounts by cos in a domain,
  countAccounts(domain_idenfitier, callback) {
    const request_data = this.buildRequestData(`CountAccount`, callback);
    request_data.parse_response = ResponseParser.countAccountResponse;
    request_data.params.params.domain = {
      'by': this.dictionary.byIdOrName(domain_idenfitier),
      '_content': domain_idenfitier
    };
    return this.performRequest(request_data);
  }

  // Full Doc: https://files.zimbra.com/docs/soap_api/8.7.0/api-reference/index.html
  backup(server, backup, fileCopier, account, callback) {
    if (server) {
      this.client.options.url = "https://" + server + ":7071/service/admin/soap";
    }
    backup = backup || {};
    if (!backup.method) backup.method = "full";
    account = account || "all";
    const request_data = this.buildRequestData(`Backup`, callback);
    request_data.params.params.backup = backup;
    request_data.params.params.backup.fileCopier = fileCopier;
    request_data.params.params.backup.account = this.dictionary.convertToZimbraArray(account, 'name');
    request_data.parse_response = ResponseParser.backupResponse;
    return this.performRequest(request_data);
  }

  // TODO: Fix this ugly FCKing Code
  batchCountAccounts(domains_ids, callback) {
    const that = this;
    const request_data = {};
    const result = [];
    request_data.callback = function(err, data) {
      if (err) return callback(err);
      data.CountAccountResponse.forEach((r) => {
        const reqid = parseInt(r.requestId);
        result[reqid - 1] = that.dictionary.cosesToCountAccountObject(r.cos);
      });
      return callback(null, result);
    };
    request_data.requests = [];
    domains_ids.forEach((domain_id) => {
      const request = this.countAccounts(domain_id);
      request_data.requests.push(request);
    });
    request_data.batch = true;
    return this.performRequest(request_data);
  }

  // GetAllVolumes
  // Get all volumes
  getAllVolumes(server, callback) {
    this.client.options.url = "https://" + server + ":7071/service/admin/soap";
    const request_data = this.buildRequestData(`GetAllVolumes`, callback);
    request_data.parse_response = ResponseParser.getAllVolumesResponse;
    return this.performRequest(request_data);
  }

  // Movel Blobs
  // https://files.zimbra.com/docs/soap_api/8.7.0/api-reference/zimbraAdmin/MoveBlobs.html
  // request is an object
  // query: https://wiki.zimbra.com/wiki/Zimbra_Web_Client_Search_Tips
  moveBlobs(server, request, callback) {
    if (!server) return false;
    this.client.options.url = "https://" + server + ":7071/service/admin/soap";
    const request_data = this.buildRequestData(`MoveBlobs`, callback);
    const query = request.query;
    delete(request.query)
    request_data.params.params = request;
    if (query) {
      request_data.params.params.query = {"_content": query};
    }
    request_data.parse_response = ResponseParser.moveBlobsResponse;
    return this.performRequest(request_data);
  }

  // Set account Password
  setPassword(zimbra_id, password, callback) {
    const request_data = this.buildRequestData(`SetPassword`, callback);
    request_data.params.params = { id: zimbra_id, newPassword: password };
    request_data.parse_response = ResponseParser.setPasswordResponse;
    return this.performRequest(request_data);
  }

  // Get Account Mailbox
  getMailbox(zimbra_id, callback) {
    const request_data = this.buildRequestData('GetMailbox', callback);
    request_data.params.params = { mbox: { id: zimbra_id } };
    request_data.parse_response = ResponseParser.getMailboxResponse;
    return this.performRequest(request_data);
  }

  /**
  * AddAppointmentInvite - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/AddAppointmentInvite.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.ptst
  * @param {msg} reqObject.m
  **/
  addAppointmentInvite(reqObject, callback) {
    const request_data = this.buildRequestData('AddAppointmentInvite', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * AddComment - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/AddComment.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {addedComment} reqObject.comment
  **/
  addComment(reqObject, callback) {
    const request_data = this.buildRequestData('AddComment', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * AddMsg - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/AddMsg.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {boolean} reqObject.filterSent
  * @param {addMsgSpec} reqObject.m
  **/
  addMsg(reqObject, callback) {
    const request_data = this.buildRequestData('AddMsg', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * AddTaskInvite - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/AddTaskInvite.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.ptst
  * @param {msg} reqObject.m
  **/
  addTaskInvite(reqObject, callback) {
    const request_data = this.buildRequestData('AddTaskInvite', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * AnnounceOrganizerChange - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/AnnounceOrganizerChange.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.id
  **/
  announceOrganizerChange(reqObject, callback) {
    const request_data = this.buildRequestData('AnnounceOrganizerChange', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * ApplyFilterRules - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/ApplyFilterRules.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {namedElement[]} reqObject.filterRules
  * @param {idsAttr} reqObject.m
  * @param {{"_content": <CONTENT TEXT>}} reqObject.query
  **/
  applyFilterRules(reqObject, callback) {
    const request_data = this.buildRequestData('ApplyFilterRules', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * ApplyOutgoingFilterRules - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/ApplyOutgoingFilterRules.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {namedElement[]} reqObject.filterRules
  * @param {idsAttr} reqObject.m
  * @param {{"_content": <CONTENT TEXT>}} reqObject.query
  **/
  applyOutgoingFilterRules(reqObject, callback) {
    const request_data = this.buildRequestData('ApplyOutgoingFilterRules', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * AutoComplete - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/AutoComplete.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.name
  * @param {galSearchType} reqObject.t
  * @param {boolean} reqObject.needExp
  * @param {string} reqObject.folders
  * @param {boolean} reqObject.includeGal
  **/
  autoComplete(reqObject, callback) {
    const request_data = this.buildRequestData('AutoComplete', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * BounceMsg - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/BounceMsg.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {bounceMsgSpec} reqObject.m
  **/
  bounceMsg(reqObject, callback) {
    const request_data = this.buildRequestData('BounceMsg', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * Browse - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/Browse.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.browseBy
  * @param {string} reqObject.regex
  * @param {int} reqObject.maxToReturn
  **/
  browse(reqObject, callback) {
    const request_data = this.buildRequestData('Browse', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * CancelAppointment - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/CancelAppointment.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.id
  * @param {int} reqObject.comp
  * @param {int} reqObject.ms
  * @param {int} reqObject.rev
  * @param {instanceRecurIdInfo} reqObject.inst
  * @param {calTZInfo} reqObject.tz
  * @param {msg} reqObject.m
  **/
  cancelAppointment(reqObject, callback) {
    const request_data = this.buildRequestData('CancelAppointment', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * CancelTask - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/CancelTask.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.id
  * @param {int} reqObject.comp
  * @param {int} reqObject.ms
  * @param {int} reqObject.rev
  * @param {instanceRecurIdInfo} reqObject.inst
  * @param {calTZInfo} reqObject.tz
  * @param {msg} reqObject.m
  **/
  cancelTask(reqObject, callback) {
    const request_data = this.buildRequestData('CancelTask', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * CheckDeviceStatus - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/CheckDeviceStatus.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {id} reqObject.device
  **/
  checkDeviceStatus(reqObject, callback) {
    const request_data = this.buildRequestData('CheckDeviceStatus', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * CheckPermission - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/CheckPermission.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {targetSpec} reqObject.target
  * @param {{"_content": <CONTENT TEXT>}[]} reqObject.right
  **/
  checkPermission(reqObject, callback) {
    const request_data = this.buildRequestData('CheckPermission', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * CheckRecurConflicts - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/CheckRecurConflicts.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {long} reqObject.s
  * @param {long} reqObject.e
  * @param {boolean} reqObject.all
  * @param {string} reqObject.excludeUid
  * @param {calTZInfo[]} reqObject.tz
  * @param {freeBusyUserSpec[]} reqObject.usr
  **/
  checkRecurConflicts(reqObject, callback) {
    const request_data = this.buildRequestData('CheckRecurConflicts', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * CheckSpelling - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/CheckSpelling.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  checkSpelling(reqObject, callback) {
    const request_data = this.buildRequestData('CheckSpelling', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * CompleteTaskInstance - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/CompleteTaskInstance.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.id
  * @param {dtTimeInfo} reqObject.exceptId
  * @param {calTZInfo} reqObject.tz
  **/
  completeTaskInstance(reqObject, callback) {
    const request_data = this.buildRequestData('CompleteTaskInstance', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * ContactAction - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/ContactAction.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {contactActionSelector} reqObject.action
  **/
  contactAction(reqObject, callback) {
    const request_data = this.buildRequestData('ContactAction', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * ConvAction - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/ConvAction.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {actionSelector} reqObject.action
  **/
  convAction(reqObject, callback) {
    const request_data = this.buildRequestData('ConvAction', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * CounterAppointment - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/CounterAppointment.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.id
  * @param {int} reqObject.comp
  * @param {int} reqObject.ms
  * @param {int} reqObject.rev
  * @param {msg} reqObject.m
  **/
  counterAppointment(reqObject, callback) {
    const request_data = this.buildRequestData('CounterAppointment', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * CreateAppointmentException - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/CreateAppointmentException.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.id
  * @param {int} reqObject.comp
  * @param {int} reqObject.ms
  * @param {int} reqObject.rev
  * @param {boolean} reqObject.echo
  * @param {int} reqObject.max
  * @param {boolean} reqObject.html
  * @param {boolean} reqObject.neuter
  * @param {boolean} reqObject.forcesend
  * @param {msg} reqObject.m
  **/
  createAppointmentException(reqObject, callback) {
    const request_data = this.buildRequestData('CreateAppointmentException', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * CreateAppointment - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/CreateAppointment.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {boolean} reqObject.echo
  * @param {int} reqObject.max
  * @param {boolean} reqObject.html
  * @param {boolean} reqObject.neuter
  * @param {boolean} reqObject.forcesend
  * @param {msg} reqObject.m
  **/
  createAppointment(reqObject, callback) {
    const request_data = this.buildRequestData('CreateAppointment', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * CreateContact - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/CreateContact.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {boolean} reqObject.verbose
  * @param {contactSpec} reqObject.cn
  **/
  createContact(reqObject, callback) {
    const request_data = this.buildRequestData('CreateContact', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * CreateDataSource - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/CreateDataSource.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  createDataSource(reqObject, callback) {
    const request_data = this.buildRequestData('CreateDataSource', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * CreateFolder - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/CreateFolder.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {newFolderSpec} reqObject.folder
  **/
  createFolder(reqObject, callback) {
    const request_data = this.buildRequestData('CreateFolder', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * CreateMountpoint - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/CreateMountpoint.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {newMountpointSpec} reqObject.link
  **/
  createMountpoint(reqObject, callback) {
    const request_data = this.buildRequestData('CreateMountpoint', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * CreateNote - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/CreateNote.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {newNoteSpec} reqObject.note
  **/
  createNote(reqObject, callback) {
    const request_data = this.buildRequestData('CreateNote', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * CreateSearchFolder - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/CreateSearchFolder.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {newSearchFolderSpec} reqObject.search
  **/
  createSearchFolder(reqObject, callback) {
    const request_data = this.buildRequestData('CreateSearchFolder', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * CreateTag - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/CreateTag.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {tagSpec} reqObject.tag
  **/
  createTag(reqObject, callback) {
    const request_data = this.buildRequestData('CreateTag', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * CreateTaskException - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/CreateTaskException.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  createTaskException(reqObject, callback) {
    const request_data = this.buildRequestData('CreateTaskException', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * CreateTask - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/CreateTask.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  createTask(reqObject, callback) {
    const request_data = this.buildRequestData('CreateTask', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * CreateWaitSet - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/CreateWaitSet.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.defTypes
  * @param {boolean} reqObject.allAccounts
  * @param {waitSetAddSpec[]} reqObject.add
  **/
  createWaitSet(reqObject, callback) {
    const request_data = this.buildRequestData('CreateWaitSet', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * DeclineCounterAppointment - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/DeclineCounterAppointment.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {msg} reqObject.m
  **/
  declineCounterAppointment(reqObject, callback) {
    const request_data = this.buildRequestData('DeclineCounterAppointment', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * DeleteDataSource - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/DeleteDataSource.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  deleteDataSource(reqObject, callback) {
    const request_data = this.buildRequestData('DeleteDataSource', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * DeleteDevice - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/DeleteDevice.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {id} reqObject.device
  **/
  deleteDevice(reqObject, callback) {
    const request_data = this.buildRequestData('DeleteDevice', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * DestroyWaitSet - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/DestroyWaitSet.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.waitSet
  **/
  destroyWaitSet(reqObject, callback) {
    const request_data = this.buildRequestData('DestroyWaitSet', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * DiffDocument - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/DiffDocument.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {diffDocumentVersionSpec} reqObject.doc
  **/
  diffDocument(reqObject, callback) {
    const request_data = this.buildRequestData('DiffDocument', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * DismissCalendarItemAlarm - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/DismissCalendarItemAlarm.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  dismissCalendarItemAlarm(reqObject, callback) {
    const request_data = this.buildRequestData('DismissCalendarItemAlarm', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * DocumentAction - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/DocumentAction.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {documentActionSelector} reqObject.action
  **/
  documentAction(reqObject, callback) {
    const request_data = this.buildRequestData('DocumentAction', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * EmptyDumpster - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/EmptyDumpster.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  emptyDumpster(reqObject, callback) {
    const request_data = this.buildRequestData('EmptyDumpster', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * EnableSharedReminder - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/EnableSharedReminder.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {sharedReminderMount} reqObject.link
  **/
  enableSharedReminder(reqObject, callback) {
    const request_data = this.buildRequestData('EnableSharedReminder', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * ExpandRecur - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/ExpandRecur.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {long} reqObject.s
  * @param {long} reqObject.e
  * @param {calTZInfo[]} reqObject.tz
  **/
  expandRecur(reqObject, callback) {
    const request_data = this.buildRequestData('ExpandRecur', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * ExportContacts - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/ExportContacts.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.ct
  * @param {string} reqObject.l
  * @param {string} reqObject.csvfmt
  * @param {string} reqObject.csvlocale
  * @param {string} reqObject.csvsep
  **/
  exportContacts(reqObject, callback) {
    const request_data = this.buildRequestData('ExportContacts', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * FolderAction - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/FolderAction.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {folderActionSelector} reqObject.action
  **/
  folderAction(reqObject, callback) {
    const request_data = this.buildRequestData('FolderAction', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * ForwardAppointmentInvite - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/ForwardAppointmentInvite.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.id
  * @param {msg} reqObject.m
  **/
  forwardAppointmentInvite(reqObject, callback) {
    const request_data = this.buildRequestData('ForwardAppointmentInvite', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * ForwardAppointment - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/ForwardAppointment.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.id
  * @param {dtTimeInfo} reqObject.exceptId
  * @param {calTZInfo} reqObject.tz
  * @param {msg} reqObject.m
  **/
  forwardAppointment(reqObject, callback) {
    const request_data = this.buildRequestData('ForwardAppointment', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GenerateUUID - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GenerateUUID.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  generateUUID(reqObject, callback) {
    const request_data = this.buildRequestData('GenerateUUID', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetActivityStream - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetActivityStream.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.id
  * @param {int} reqObject.offset
  * @param {int} reqObject.limit
  * @param {activityFilter} reqObject.filter
  **/
  getActivityStream(reqObject, callback) {
    const request_data = this.buildRequestData('GetActivityStream', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetAllDevices - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetAllDevices.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  getAllDevices(reqObject, callback) {
    const request_data = this.buildRequestData('GetAllDevices', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetAppointment - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetAppointment.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {boolean} reqObject.sync
  * @param {boolean} reqObject.includeContent
  * @param {boolean} reqObject.includeInvites
  * @param {string} reqObject.uid
  * @param {string} reqObject.id
  **/
  getAppointment(reqObject, callback) {
    const request_data = this.buildRequestData('GetAppointment', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetApptSummaries - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetApptSummaries.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {long} reqObject.s
  * @param {long} reqObject.e
  * @param {string} reqObject.l
  **/
  getApptSummaries(reqObject, callback) {
    const request_data = this.buildRequestData('GetApptSummaries', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetCalendarItemSummaries - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetCalendarItemSummaries.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {long} reqObject.s
  * @param {long} reqObject.e
  * @param {string} reqObject.l
  **/
  getCalendarItemSummaries(reqObject, callback) {
    const request_data = this.buildRequestData('GetCalendarItemSummaries', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetComments - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetComments.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {parentId} reqObject.comment
  **/
  getComments(reqObject, callback) {
    const request_data = this.buildRequestData('GetComments', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetContacts - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetContacts.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {boolean} reqObject.sync
  * @param {string} reqObject.l
  * @param {string} reqObject.sortBy
  * @param {boolean} reqObject.derefGroupMember
  * @param {boolean} reqObject.returnHiddenAttrs
  * @param {long} reqObject.maxMembers
  * @param {attributeName[]} reqObject.a
  * @param {attributeName[]} reqObject.ma
  * @param {id[]} reqObject.cn
  **/
  getContacts(reqObject, callback) {
    const request_data = this.buildRequestData('GetContacts', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetConv - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetConv.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {conversationSpec} reqObject.c
  **/
  getConv(reqObject, callback) {
    const request_data = this.buildRequestData('GetConv', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetCustomMetadata - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetCustomMetadata.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.id
  * @param {sectionAttr} reqObject.meta
  **/
  getCustomMetadata(reqObject, callback) {
    const request_data = this.buildRequestData('GetCustomMetadata', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetDataSources - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetDataSources.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  getDataSources(reqObject, callback) {
    const request_data = this.buildRequestData('GetDataSources', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetDocumentShareURL - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetDocumentShareURL.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {itemSpec} reqObject.item
  **/
  getDocumentShareURL(reqObject, callback) {
    const request_data = this.buildRequestData('GetDocumentShareURL', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetEffectiveFolderPerms - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetEffectiveFolderPerms.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {folderSpec} reqObject.folder
  **/
  getEffectiveFolderPerms(reqObject, callback) {
    const request_data = this.buildRequestData('GetEffectiveFolderPerms', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetFilterRules - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetFilterRules.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  getFilterRules(reqObject, callback) {
    const request_data = this.buildRequestData('GetFilterRules', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetFolder - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetFolder.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {boolean} reqObject.visible
  * @param {boolean} reqObject.needGranteeName
  * @param {string} reqObject.view
  * @param {int} reqObject.depth
  * @param {boolean} reqObject.tr
  * @param {getFolderSpec} reqObject.folder
  **/
  getFolder(reqObject, callback) {
    const request_data = this.buildRequestData('GetFolder', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetFreeBusy - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetFreeBusy.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {long} reqObject.s
  * @param {long} reqObject.e
  * @param {string} reqObject.uid
  * @param {string} reqObject.id
  * @param {string} reqObject.name
  * @param {string} reqObject.excludeUid
  * @param {freeBusyUserSpec[]} reqObject.usr
  **/
  getFreeBusy(reqObject, callback) {
    const request_data = this.buildRequestData('GetFreeBusy', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetICal - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetICal.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.id
  * @param {long} reqObject.s
  * @param {long} reqObject.e
  **/
  getICal(reqObject, callback) {
    const request_data = this.buildRequestData('GetICal', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetImportStatus - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetImportStatus.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  getImportStatus(reqObject, callback) {
    const request_data = this.buildRequestData('GetImportStatus', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetItem - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetItem.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {itemSpec} reqObject.item
  **/
  getItem(reqObject, callback) {
    const request_data = this.buildRequestData('GetItem', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetMailboxMetadata - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetMailboxMetadata.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {sectionAttr} reqObject.meta
  **/
  getMailboxMetadata(reqObject, callback) {
    const request_data = this.buildRequestData('GetMailboxMetadata', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetMiniCal - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetMiniCal.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {long} reqObject.s
  * @param {long} reqObject.e
  * @param {id[]} reqObject.folder
  * @param {calTZInfo} reqObject.tz
  **/
  getMiniCal(reqObject, callback) {
    const request_data = this.buildRequestData('GetMiniCal', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetMsgMetadata - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetMsgMetadata.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {idsAttr} reqObject.m
  **/
  getMsgMetadata(reqObject, callback) {
    const request_data = this.buildRequestData('GetMsgMetadata', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetMsg - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetMsg.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {msgSpec} reqObject.m
  **/
  getMsg(reqObject, callback) {
    const request_data = this.buildRequestData('GetMsg', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetNote - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetNote.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {id} reqObject.note
  **/
  getNote(reqObject, callback) {
    const request_data = this.buildRequestData('GetNote', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetNotifications - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetNotifications.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {boolean} reqObject.markSeen
  **/
  getNotifications(reqObject, callback) {
    const request_data = this.buildRequestData('GetNotifications', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetOutgoingFilterRules - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetOutgoingFilterRules.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  getOutgoingFilterRules(reqObject, callback) {
    const request_data = this.buildRequestData('GetOutgoingFilterRules', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetPermission - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetPermission.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.unusedCodeGenHelper
  * @param {right[]} reqObject.ace
  **/
  getPermission(reqObject, callback) {
    const request_data = this.buildRequestData('GetPermission', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetRecur - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetRecur.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.id
  **/
  getRecur(reqObject, callback) {
    const request_data = this.buildRequestData('GetRecur', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetSearchFolder - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetSearchFolder.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  getSearchFolder(reqObject, callback) {
    const request_data = this.buildRequestData('GetSearchFolder', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetShareDetails - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetShareDetails.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {id} reqObject.item
  **/
  getShareDetails(reqObject, callback) {
    const request_data = this.buildRequestData('GetShareDetails', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetShareNotifications - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetShareNotifications.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  getShareNotifications(reqObject, callback) {
    const request_data = this.buildRequestData('GetShareNotifications', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetSpellDictionaries - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetSpellDictionaries.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  getSpellDictionaries(reqObject, callback) {
    const request_data = this.buildRequestData('GetSpellDictionaries', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetSystemRetentionPolicy - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetSystemRetentionPolicy.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  getSystemRetentionPolicy(reqObject, callback) {
    const request_data = this.buildRequestData('GetSystemRetentionPolicy', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetTag - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetTag.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  getTag(reqObject, callback) {
    const request_data = this.buildRequestData('GetTag', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetTask - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetTask.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {boolean} reqObject.sync
  * @param {boolean} reqObject.includeContent
  * @param {boolean} reqObject.includeInvites
  * @param {string} reqObject.uid
  * @param {string} reqObject.id
  **/
  getTask(reqObject, callback) {
    const request_data = this.buildRequestData('GetTask', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetTaskSummaries - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetTaskSummaries.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {long} reqObject.s
  * @param {long} reqObject.e
  * @param {string} reqObject.l
  **/
  getTaskSummaries(reqObject, callback) {
    const request_data = this.buildRequestData('GetTaskSummaries', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetWatchers - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetWatchers.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  getWatchers(reqObject, callback) {
    const request_data = this.buildRequestData('GetWatchers', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetWatchingItems - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetWatchingItems.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  getWatchingItems(reqObject, callback) {
    const request_data = this.buildRequestData('GetWatchingItems', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetWorkingHours - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetWorkingHours.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {long} reqObject.s
  * @param {long} reqObject.e
  * @param {string} reqObject.id
  * @param {string} reqObject.name
  **/
  getWorkingHours(reqObject, callback) {
    const request_data = this.buildRequestData('GetWorkingHours', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetYahooAuthToken - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetYahooAuthToken.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.user
  * @param {string} reqObject.password
  **/
  getYahooAuthToken(reqObject, callback) {
    const request_data = this.buildRequestData('GetYahooAuthToken', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GetYahooCookie - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GetYahooCookie.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.user
  **/
  getYahooCookie(reqObject, callback) {
    const request_data = this.buildRequestData('GetYahooCookie', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * GrantPermission - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/GrantPermission.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.unusedCodeGenHelper
  * @param {accountACEinfo[]} reqObject.ace
  **/
  grantPermission(reqObject, callback) {
    const request_data = this.buildRequestData('GrantPermission', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * ICalReply - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/ICalReply.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {{"_content": <CONTENT TEXT>}} reqObject.ical
  **/
  iCalReply(reqObject, callback) {
    const request_data = this.buildRequestData('ICalReply', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * ImportAppointments - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/ImportAppointments.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.l
  * @param {string} reqObject.ct
  * @param {contentSpec} reqObject.content
  **/
  importAppointments(reqObject, callback) {
    const request_data = this.buildRequestData('ImportAppointments', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * ImportContacts - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/ImportContacts.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.ct
  * @param {string} reqObject.l
  * @param {string} reqObject.csvfmt
  * @param {string} reqObject.csvlocale
  * @param {content} reqObject.content
  **/
  importContacts(reqObject, callback) {
    const request_data = this.buildRequestData('ImportContacts', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * ImportData - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/ImportData.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  importData(reqObject, callback) {
    const request_data = this.buildRequestData('ImportData', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * InvalidateReminderDevice - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/InvalidateReminderDevice.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.a
  **/
  invalidateReminderDevice(reqObject, callback) {
    const request_data = this.buildRequestData('InvalidateReminderDevice', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * ItemAction - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/ItemAction.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {actionSelector} reqObject.action
  **/
  itemAction(reqObject, callback) {
    const request_data = this.buildRequestData('ItemAction', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * ListDocumentRevisions - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/ListDocumentRevisions.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {listDocumentRevisionsSpec} reqObject.doc
  **/
  listDocumentRevisions(reqObject, callback) {
    const request_data = this.buildRequestData('ListDocumentRevisions', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * ModifyAppointment - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/ModifyAppointment.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.id
  * @param {int} reqObject.comp
  * @param {int} reqObject.ms
  * @param {int} reqObject.rev
  * @param {boolean} reqObject.echo
  * @param {int} reqObject.max
  * @param {boolean} reqObject.html
  * @param {boolean} reqObject.neuter
  * @param {boolean} reqObject.forcesend
  * @param {msg} reqObject.m
  **/
  modifyAppointment(reqObject, callback) {
    const request_data = this.buildRequestData('ModifyAppointment', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * ModifyContact - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/ModifyContact.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {boolean} reqObject.replace
  * @param {boolean} reqObject.verbose
  * @param {modifyContactSpec} reqObject.cn
  **/
  modifyContact(reqObject, callback) {
    const request_data = this.buildRequestData('ModifyContact', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * ModifyDataSource - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/ModifyDataSource.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  modifyDataSource(reqObject, callback) {
    const request_data = this.buildRequestData('ModifyDataSource', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * ModifyFilterRules - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/ModifyFilterRules.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {filterRule[]} reqObject.filterRules
  **/
  modifyFilterRules(reqObject, callback) {
    const request_data = this.buildRequestData('ModifyFilterRules', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * ModifyMailboxMetadata - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/ModifyMailboxMetadata.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {meta} reqObject.meta
  **/
  modifyMailboxMetadata(reqObject, callback) {
    const request_data = this.buildRequestData('ModifyMailboxMetadata', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * ModifyOutgoingFilterRules - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/ModifyOutgoingFilterRules.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {filterRule[]} reqObject.filterRules
  **/
  modifyOutgoingFilterRules(reqObject, callback) {
    const request_data = this.buildRequestData('ModifyOutgoingFilterRules', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * ModifySearchFolder - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/ModifySearchFolder.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {modifySearchFolderSpec} reqObject.search
  **/
  modifySearchFolder(reqObject, callback) {
    const request_data = this.buildRequestData('ModifySearchFolder', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * ModifyTask - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/ModifyTask.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  modifyTask(reqObject, callback) {
    const request_data = this.buildRequestData('ModifyTask', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * MsgAction - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/MsgAction.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {actionSelector} reqObject.action
  **/
  msgAction(reqObject, callback) {
    const request_data = this.buildRequestData('MsgAction', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * NoOp - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/NoOp.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {boolean} reqObject.wait
  * @param {boolean} reqObject.delegate
  * @param {boolean} reqObject.limitToOneBlocked
  * @param {long} reqObject.timeout
  **/
  noOp(reqObject, callback) {
    const request_data = this.buildRequestData('NoOp', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * NoteAction - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/NoteAction.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {noteActionSelector} reqObject.action
  **/
  noteAction(reqObject, callback) {
    const request_data = this.buildRequestData('NoteAction', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * PurgeRevision - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/PurgeRevision.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {purgeRevisionSpec} reqObject.revision
  **/
  purgeRevision(reqObject, callback) {
    const request_data = this.buildRequestData('PurgeRevision', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * RankingAction - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/RankingAction.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {rankingActionSpec} reqObject.action
  **/
  rankingAction(reqObject, callback) {
    const request_data = this.buildRequestData('RankingAction', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * RegisterDevice - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/RegisterDevice.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {namedElement} reqObject.device
  **/
  registerDevice(reqObject, callback) {
    const request_data = this.buildRequestData('RegisterDevice', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * RemoveAttachments - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/RemoveAttachments.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {msgPartIds} reqObject.m
  **/
  removeAttachments(reqObject, callback) {
    const request_data = this.buildRequestData('RemoveAttachments', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * RevokePermission - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/RevokePermission.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.unusedCodeGenHelper
  * @param {accountACEinfo[]} reqObject.ace
  **/
  revokePermission(reqObject, callback) {
    const request_data = this.buildRequestData('RevokePermission', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * SaveDocument - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/SaveDocument.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {documentSpec} reqObject.doc
  **/
  saveDocument(reqObject, callback) {
    const request_data = this.buildRequestData('SaveDocument', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * SaveDraft - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/SaveDraft.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {saveDraftMsg} reqObject.m
  **/
  saveDraft(reqObject, callback) {
    const request_data = this.buildRequestData('SaveDraft', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * SearchConv - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/SearchConv.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.cid
  * @param {boolean} reqObject.nest
  * @param {boolean} reqObject.includeTagDeleted
  * @param {boolean} reqObject.includeTagMuted
  * @param {string} reqObject.allowableTaskStatus
  * @param {long} reqObject.calExpandInstStart
  * @param {long} reqObject.calExpandInstEnd
  * @param {boolean} reqObject.inDumpster
  * @param {string} reqObject.types
  * @param {string} reqObject.groupBy
  * @param {boolean} reqObject.quick
  * @param {string} reqObject.sortBy
  * @param {string} reqObject.fetch
  * @param {boolean} reqObject.read
  * @param {int} reqObject.max
  * @param {boolean} reqObject.html
  * @param {boolean} reqObject.needExp
  * @param {boolean} reqObject.neuter
  * @param {wantRecipsSetting} reqObject.recip
  * @param {boolean} reqObject.prefetch
  * @param {string} reqObject.resultMode
  * @param {boolean} reqObject.fullConversation
  * @param {string} reqObject.field
  * @param {int} reqObject.limit
  * @param {int} reqObject.offset
  * @param {{"_content": <CONTENT TEXT>}} reqObject.query
  * @param {attributeName[]} reqObject.header
  * @param {calTZInfo} reqObject.tz
  * @param {{"_content": <CONTENT TEXT>}} reqObject.locale
  * @param {cursorInfo} reqObject.cursor
  **/
  searchConv(reqObject, callback) {
    const request_data = this.buildRequestData('SearchConv', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * Search - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/Search.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {boolean} reqObject.warmup
  * @param {boolean} reqObject.includeTagDeleted
  * @param {boolean} reqObject.includeTagMuted
  * @param {string} reqObject.allowableTaskStatus
  * @param {long} reqObject.calExpandInstStart
  * @param {long} reqObject.calExpandInstEnd
  * @param {boolean} reqObject.inDumpster
  * @param {string} reqObject.types
  * @param {string} reqObject.groupBy
  * @param {boolean} reqObject.quick
  * @param {string} reqObject.sortBy
  * @param {string} reqObject.fetch
  * @param {boolean} reqObject.read
  * @param {int} reqObject.max
  * @param {boolean} reqObject.html
  * @param {boolean} reqObject.needExp
  * @param {boolean} reqObject.neuter
  * @param {wantRecipsSetting} reqObject.recip
  * @param {boolean} reqObject.prefetch
  * @param {string} reqObject.resultMode
  * @param {boolean} reqObject.fullConversation
  * @param {string} reqObject.field
  * @param {int} reqObject.limit
  * @param {int} reqObject.offset
  * @param {{"_content": <CONTENT TEXT>}} reqObject.query
  * @param {attributeName[]} reqObject.header
  * @param {calTZInfo} reqObject.tz
  * @param {{"_content": <CONTENT TEXT>}} reqObject.locale
  * @param {cursorInfo} reqObject.cursor
  **/
  search(reqObject, callback) {
    const request_data = this.buildRequestData('Search', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * SendDeliveryReport - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/SendDeliveryReport.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.mid
  **/
  sendDeliveryReport(reqObject, callback) {
    const request_data = this.buildRequestData('SendDeliveryReport', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * SendInviteReply - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/SendInviteReply.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.id
  * @param {int} reqObject.compNum
  * @param {string} reqObject.verb
  * @param {boolean} reqObject.updateOrganizer
  * @param {string} reqObject.idnt
  * @param {dtTimeInfo} reqObject.exceptId
  * @param {calTZInfo} reqObject.tz
  * @param {msg} reqObject.m
  **/
  sendInviteReply(reqObject, callback) {
    const request_data = this.buildRequestData('SendInviteReply', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * SendMsg - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/SendMsg.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {boolean} reqObject.needCalendarSentByFixup
  * @param {boolean} reqObject.isCalendarForward
  * @param {boolean} reqObject.noSave
  * @param {string} reqObject.suid
  * @param {msgToSend} reqObject.m
  **/
  sendMsg(reqObject, callback) {
    const request_data = this.buildRequestData('SendMsg', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * SendShareNotification - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/SendShareNotification.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {action} reqObject.action
  * @param {id} reqObject.item
  * @param {emailAddrInfo[]} reqObject.e
  * @param {{"_content": <CONTENT TEXT>}} reqObject.notes
  **/
  sendShareNotification(reqObject, callback) {
    const request_data = this.buildRequestData('SendShareNotification', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * SendVerificationCode - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/SendVerificationCode.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.a
  **/
  sendVerificationCode(reqObject, callback) {
    const request_data = this.buildRequestData('SendVerificationCode', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * SetAppointment - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/SetAppointment.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.f
  * @param {string} reqObject.t
  * @param {string} reqObject.tn
  * @param {string} reqObject.l
  * @param {boolean} reqObject.noNextAlarm
  * @param {long} reqObject.nextAlarm
  * @param {setCalendarItemInfo} reqObject.default
  * @param {setCalendarItemInfo[]} reqObject.except
  * @param {setCalendarItemInfo[]} reqObject.cancel
  * @param {calReply[]} reqObject.replies
  **/
  setAppointment(reqObject, callback) {
    const request_data = this.buildRequestData('SetAppointment', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * SetCustomMetadata - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/SetCustomMetadata.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.id
  * @param {meta} reqObject.meta
  **/
  setCustomMetadata(reqObject, callback) {
    const request_data = this.buildRequestData('SetCustomMetadata', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * SetMailboxMetadata - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/SetMailboxMetadata.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {meta} reqObject.meta
  **/
  setMailboxMetadata(reqObject, callback) {
    const request_data = this.buildRequestData('SetMailboxMetadata', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * SetTask - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/SetTask.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.f
  * @param {string} reqObject.t
  * @param {string} reqObject.tn
  * @param {string} reqObject.l
  * @param {boolean} reqObject.noNextAlarm
  * @param {long} reqObject.nextAlarm
  * @param {setCalendarItemInfo} reqObject.default
  * @param {setCalendarItemInfo[]} reqObject.except
  * @param {setCalendarItemInfo[]} reqObject.cancel
  * @param {calReply[]} reqObject.replies
  **/
  setTask(reqObject, callback) {
    const request_data = this.buildRequestData('SetTask', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * SnoozeCalendarItemAlarm - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/SnoozeCalendarItemAlarm.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  snoozeCalendarItemAlarm(reqObject, callback) {
    const request_data = this.buildRequestData('SnoozeCalendarItemAlarm', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * Sync - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/Sync.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.token
  * @param {long} reqObject.calCutoff
  * @param {string} reqObject.l
  * @param {boolean} reqObject.typed
  **/
  sync(reqObject, callback) {
    const request_data = this.buildRequestData('Sync', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * TagAction - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/TagAction.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {tagActionSelector} reqObject.action
  **/
  tagAction(reqObject, callback) {
    const request_data = this.buildRequestData('TagAction', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * TestDataSource - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/TestDataSource.html | Zimbra Doc }
  * @param {Object} reqObject
  **/
  testDataSource(reqObject, callback) {
    const request_data = this.buildRequestData('TestDataSource', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * UpdateDeviceStatus - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/UpdateDeviceStatus.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {idStatus} reqObject.device
  **/
  updateDeviceStatus(reqObject, callback) {
    const request_data = this.buildRequestData('UpdateDeviceStatus', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * VerifyCode - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/VerifyCode.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.a
  * @param {string} reqObject.code
  **/
  verifyCode(reqObject, callback) {
    const request_data = this.buildRequestData('VerifyCode', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }


  /**
  * WaitSet - {@link https://files.zimbra.com/docs/soap_api/8.6.0/api-reference/zimbraMail/WaitSet.html | Zimbra Doc }
  * @param {Object} reqObject
  * @param {string} reqObject.waitSet
  * @param {string} reqObject.seq
  * @param {boolean} reqObject.block
  * @param {string} reqObject.defTypes
  * @param {long} reqObject.timeout
  * @param {waitSetAddSpec[]} reqObject.add
  * @param {waitSetAddSpec[]} reqObject.update
  * @param {id[]} reqObject.remove
  **/
  waitSet(reqObject, callback) {
    const request_data = this.buildRequestData('WaitSet', callback);
    request_data.params.params = reqObject;
    request_data.params.namespace = 'zimbraMail';
    request_data.parse_response = ResponseParser.debugResponse;
    return this.performRequest(request_data);
  }
}

module.exports = ZimbraAdminApi;

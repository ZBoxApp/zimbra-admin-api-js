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
      'isPassword': true, 'isAdmin': true
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
        if (err) return this.handleError(err);
        if (request_data.batch) return that.makeBatchRequest(request_data.requests, request_data.callback);
        that.makeRequest(request_data);
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

  //Add distribution list alias
  //
  addDistributionListAlias(dl_id, alias, callback) {
    const request_data = this.buildRequestData('AddDistributionListAlias', callback);
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

}


module.exports = ZimbraAdminApi;

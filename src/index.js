// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

var jszimbra = require('js-zimbra');
import Dictionary from './utils/dictionary.js';

class Error {
  constructor(err) {
    this.status = err.status;
    this.title = err.statusText;
    this.extra = this.getErrorInfo(err.responseJSON);
  }

  getErrorInfo(responseJSON) {
    if (responseJSON && responseJSON.Body) {
      return {
        'code': responseJSON.Body.Fault.Detail.Error.Code,
        'reason': responseJSON.Body.Fault.Reason.Text
      }
    } else {
      return {};
    }
  }

}


// TODO: To many parseResponse types
export default class ZimbraAdminApi {
  constructor(auth_object) {
    this.url = auth_object.url;
    this.user = auth_object.user;
    this.password = auth_object.password;
    this._client = new jszimbra.Communication({url: auth_object.url});
    this.parseAllResponse = this.parseAllResponse.bind(this);
    this.parseResponse = this.parseResponse.bind(this);
    this.parseEmptyResponse = this.parseEmptyResponse.bind(this);
    this.parseCountAccountResponse = this.parseCountAccountResponse.bind(this);
    this.parseSearchResponse = this.parseSearchResponse.bind(this);
    this.parseGrantsResponse = this.parseGrantsResponse.bind(this);
    this.dictionary = new Dictionary();
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
    return new Error(err);
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
      if (err) return (callback || that.handleError)(err);
      return (callback || that.handleResponse)(null, response);
    });
  }

  buildRequest() {
    let request = null;
    this.client.getRequest({}, (err, req) => {
      if (err) return error(err);
        request = req;
      });
    return request;
  }


  makeRequest(request_data) {
    const that = this;
    let request_object = that.buildRequest();
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
    if (this.client.token) {
      this.makeRequest(request_data);
    } else {
      const that = this;
      let getCallback = function(err, response){
        if (err) return this.handleError(err);
        that.makeRequest(request_data);
      };
      this.login(getCallback);
    }
  }

  parseCountAccountResponse(data, request_data, callback) {
    const result = {};
    const coses = data.get().CountAccountResponse.cos;
    if (typeof coses !== 'undefined') coses.forEach((cos) => {
      result[cos.name] = {
        used: parseInt(cos._content),
        id: cos.id
      };
    });
    return callback(null, result);
  }

  parseGrantsResponse(data, request_data, callback) {
    const result = {};
    const response_object = data.get().GetGrantsResponse;
    callback(null, response_object);
  }

  parseResponse(data, request_data, callback) {
    const resource = request_data.resource.toLowerCase();
    const that = this;
    const response_name = that.dictionary.resourceResponseName(resource);
    const response_object = data.get()[request_data.response_name][response_name][0];
    const result = that.dictionary.classFactory(resource, response_object, that);
    return callback(null, result);
  }

  // For requests that returns empty Object when Success
  parseEmptyResponse(data, request_data, callback){
    const response_object = data.get()[request_data.response_name];
    return callback(null, response_object);
  }

  parseSearchResponse(data, request_data, callback) {
    const response_types = this.dictionary.searchResponseTypes();
    const response_object = data.get()[request_data.response_name];
    const result = { total: response_object.searchTotal, more: response_object.more };
    const that = this;
    response_types.forEach((type) => {
      const resources = [];
      if (typeof response_object[type] !== 'undefined') {
        response_object[type].forEach((resource) => {
          const object = that.dictionary.classFactory(type, resource, that);
          resources.push(object);
        });
        result[type] = resources;
      }
    });
    return callback(null, result);
  }

  parseAllResponse(data, request_data, callback){
    const resource = request_data.resource.toLowerCase();
    const that = this;
    const response_name = that.dictionary.resourceResponseName(resource);
    const response_object = data.get()[request_data.response_name][response_name];
    const response_array = [];
    if (response_object) response_object.forEach((r) => {
      let element = that.dictionary.classFactory(resource, r, that);
      response_array.push(element);
    });
    return callback(null, response_array);
  }

  create(resource, resource_data, callback){
    let request_data = { };
    request_data.params = this.requestParams();
    request_data.request_name = `Create${resource}`;
    request_data.response_name = `Create${resource}Response`;
    request_data.params.name = `${request_data.request_name}Request`;
    request_data.resource = resource;
    request_data.callback = callback;
    request_data.parse_response = this.parseResponse;
    request_data.params.params = resource_data;
    this.performRequest(request_data);
  }

  remove(resource, resource_data, callback){
    let request_data = { };
    request_data.params = this.requestParams();
    request_data.request_name = `Delete${resource}`;
    request_data.response_name = `Delete${resource}Response`;
    request_data.params.name = `${request_data.request_name}Request`;
    request_data.resource = resource;
    request_data.callback = callback;
    request_data.parse_response = this.parseEmptyResponse;
    request_data.params.params = resource_data;
    this.performRequest(request_data);
  }


  modify(resource, resource_data, callback){
    let request_data = { };
    request_data.params = this.requestParams();
    request_data.request_name = `Modify${resource}`;
    request_data.response_name = `Modify${resource}Response`;
    request_data.params.name = `${request_data.request_name}Request`;
    request_data.resource = resource;
    request_data.callback = callback;
    request_data.parse_response = this.parseResponse;
    request_data.params.params = resource_data;
    this.performRequest(request_data);
  }

  get(resource, resource_identifier, callback){
    let request_data = { };
    request_data.params = this.requestParams();
    request_data.request_name = `Get${resource}`;
    request_data.response_name = `Get${resource}Response`;
    request_data.params.name = `${request_data.request_name}Request`;
    request_data.resource = resource;
    request_data.callback = callback;
    request_data.parse_response = this.parseResponse;
    let resource_name = this.dictionary.resourceResponseName(resource);
    request_data.params.params[resource_name] = {
      'by': this.dictionary.byIdOrName(resource_identifier),
      '_content': resource_identifier
    };
    this.performRequest(request_data);
  }

  getAll(resource, callback) {
    let request_data = { };
    request_data.params = this.requestParams();
    request_data.request_name = `GetAll${resource}s`;
    request_data.response_name = `GetAll${resource}sResponse`;
    request_data.params.name = `${request_data.request_name}Request`;
    request_data.resource = resource;
    request_data.callback = callback;
    request_data.parse_response = this.parseAllResponse;
    this.performRequest(request_data);
  }

  // Grant a right on a target to an individual or group grantee.
  // target_data  and grantee_data are both objects like:
  // {
  //  type: (account|cos|dl|domain),
  //  identifier: (name or zimbraId)
  // }
  grantRight(target_data, grantee_data, right_name, callback) {
    const request_data = { };
    const [target, grantee] = this.dictionary.buildTargetGrantee(target_data, grantee_data);
    request_data.params = this.requestParams();
    request_data.request_name = 'GrantRight';
    request_data.params.name = `${request_data.request_name}Request`;
    request_data.response_name = `${request_data.request_name}Response`;
    request_data.callback = callback;
    request_data.parse_response = this.parseEmptyResponse;
    request_data.params.params.grantee = grantee;
    request_data.params.params.target = target;
    request_data.params.params.right = { '_content': right_name };
    this.performRequest(request_data);
  }

  // Specific functions

  addAccountAlias(account_id, alias, callback) {
    const request_data = { };
    request_data.params = this.requestParams();
    request_data.request_name = 'AddAccountAlias';
    request_data.params.name = `${request_data.request_name}Request`;
    request_data.response_name = `${request_data.request_name}Response`;
    request_data.callback = callback;
    request_data.parse_response = this.parseEmptyResponse;
    request_data.params.params = { 'id': account_id, 'alias': alias };
    this.performRequest(request_data);
  }

  // Add New members tos distributionlists
  // members is an array of emails
  addDistributionListMember(dl_id, members, callback) {
    const request_data = { };
    request_data.params = this.requestParams();
    request_data.request_name = 'AddDistributionListMember';
    request_data.params.name = `${request_data.request_name}Request`;
    request_data.response_name = `${request_data.request_name}Response`;
    request_data.callback = callback;
    request_data.parse_response = this.parseEmptyResponse;
    request_data.params.params = { id: dl_id, dlm: this.dictionary.convertToZimbraArray(members) };
    this.performRequest(request_data);
  }

  getAccount(identifier, callback) {
    this.get('Account', identifier, callback);
  }

  // attributes debe ser un arreglo de objetos:
  // let resource_attributes = {
  //   zimbraSkinLogoURL: 'http://www.zboxapp.com',
  //   postOfficeBox: 'ZBoxApp'
  // };
  createAccount(name, password, attributes, callback) {
    let resource_data = {
      name: { '_content': name },
      password: { '_content': password },
      a: this.dictionary.attributesToArray(attributes)
    };
    this.create('Account', resource_data, callback);
  }

  getCos(identifier, callback) {
    this.get('Cos', identifier, callback);
  }

  getDomain(identifier, callback) {
    this.get('Domain', identifier, callback);
  }

  createDomain(name, attributes, callback) {
    let resource_data = {
      name: { '_content': name },
      a: this.dictionary.attributesToArray(attributes)
    };
    this.create('Domain', resource_data, callback);
  }

  getDistributionList(identifier, callback) {
    this.get('DistributionList', identifier, callback);
  }

  createDistributionList(name, attributes, callback) {
    let resource_data = {
      name: { '_content': name },
      a: this.dictionary.attributesToArray(attributes)
    };
    this.create('DistributionList', resource_data, callback);
  }


  getAllDomains(callback, query_object = {}) {
    query_object.types = 'domains';
    this.directorySearch(query_object, callback);
  }

  getAllAccounts(callback, query_object = {}) {
    query_object.types = 'accounts';
    this.directorySearch(query_object, callback);
  }

  getAllDistributionLists(callback, query_object = {}) {
    query_object.types = 'distributionlists';
    this.directorySearch(query_object, callback);
  }

  getAllAliases(callback, query_object = {}) {
    query_object.types = 'aliases';
    this.directorySearch(query_object, callback);
  }

  getAllCos(callback) {
    let request_data = { };
    const resource = 'Cos';
    request_data.params = this.requestParams();
    request_data.request_name = `GetAll${resource}`;
    request_data.response_name = `GetAll${resource}Response`;
    request_data.params.name = `${request_data.request_name}Request`;
    request_data.resource = resource;
    request_data.callback = callback;
    request_data.parse_response = this.parseAllResponse;
    this.performRequest(request_data);
  }

  // Returns all grants on the specified target entry, or all grants granted to the specified grantee entry.
  // target_data  and grantee_data are both objects like:
  // {
  //  type: (account|cos|dl|domain),
  //  identifier: (name or zimbraId)
  // }
  getGrants(target_data, grantee_data, callback) {
    const request_data = { };
    const [target, grantee] = this.dictionary.buildTargetGrantee(target_data, grantee_data);
    const resource = 'Grant';
    request_data.params = this.requestParams();
    request_data.request_name = `Get${resource}s`;
    request_data.response_name = `Get${resource}sResponse`;
    request_data.params.name = `${request_data.request_name}Request`;
    request_data.callback = callback;
    request_data.resource = resource;
    request_data.parse_response = this.parseAllResponse;
    request_data.params.params.grantee = grantee;
    request_data.params.params.target = target;
    this.performRequest(request_data);
  }

  // Get current logged account information
  getInfo(callback) {
    const request_data = { };
    request_data.params = { namespace: 'zimbraAccount' };
    request_data.request_name = "GetInfo";
    request_data.params.name = `${request_data.request_name}Request`;
    request_data.callback = callback;
    const that = this;
    request_data.parse_response = function(data, _, callback){
      return callback(null, data.response[0].GetInfoResponse);
    };
    this.performRequest(request_data);
  }

  // Modify Account
  modifyAccount(zimbra_id, attributes, callback) {
    let resource_data = {
      id: zimbra_id,
      a: this.dictionary.attributesToArray(attributes)
    };
    this.modify('Account', resource_data, callback);
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
    this.remove('Account', resource_data, callback);
  }

  // Remove Account Alias
  removeAccountAlias(account_id, alias, callback) {
    const request_data = { };
    request_data.params = this.requestParams();
    request_data.request_name = 'RemoveAccountAlias';
    request_data.params.name = `${request_data.request_name}Request`;
    request_data.response_name = `${request_data.request_name}Response`;
    request_data.callback = callback;
    request_data.parse_response = this.parseEmptyResponse;
    request_data.params.params = { 'id': account_id, 'alias': alias };
    this.performRequest(request_data);
  }

  // Remove Account
  removeDomain(zimbra_id, callback) {
    let resource_data = { id: zimbra_id };
    this.remove('Domain', resource_data, callback);
  }

  // Remove DL
  removeDistributionList(zimbra_id, callback) {
    let resource_data = { id: zimbra_id };
    this.remove('DistributionList', resource_data, callback);
  }

  // Add New members tos distributionlists
  // members is one email or array of emails
  removeDistributionListMember(dl_id, members, callback) {
    const request_data = { };
    request_data.params = this.requestParams();
    request_data.request_name = 'RemoveDistributionListMember';
    request_data.params.name = `${request_data.request_name}Request`;
    request_data.response_name = `${request_data.request_name}Response`;
    request_data.callback = callback;
    request_data.parse_response = this.parseEmptyResponse;
    request_data.params.params = { id: dl_id, dlm: this.dictionary.convertToZimbraArray(members) };
    this.performRequest(request_data);
  }

  revokeRight(target_data, grantee_data, right_name, callback) {
    const request_data = { };
    const [target, grantee] = this.dictionary.buildTargetGrantee(target_data, grantee_data);
    request_data.params = this.requestParams();
    request_data.request_name = 'RevokeRight';
    request_data.params.name = `${request_data.request_name}Request`;
    request_data.response_name = `${request_data.request_name}Response`;
    request_data.callback = callback;
    request_data.parse_response = this.parseEmptyResponse;
    request_data.params.params.grantee = grantee;
    request_data.params.params.target = target;
    request_data.params.params.right = { '_content': right_name };
    this.performRequest(request_data);
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
    const request_data = { };
    request_data.params = this.requestParams();
    request_data.params.params = search_object;
    request_data.request_name = "SearchDirectory";
    request_data.response_name = "SearchDirectoryResponse";
    request_data.params.name = `${request_data.request_name}Request`;
    request_data.callback = callback;
    request_data.parse_response = this.parseSearchResponse;
    this.performRequest(request_data);
  }

  // TODO: Fucking ugly code to make it better
  // Count Accounts
  // Count number of accounts by cos in a domain,
  countAccounts(domain_idenfitier, callback) {
    const request_data = { };
    request_data.params = this.requestParams();
    request_data.request_name = 'CountAccount';
    request_data.response_name = 'CountAccountResponse';
    request_data.params.name = `${request_data.request_name}Request`;
    request_data.callback = callback;
    request_data.parse_response = this.parseCountAccountResponse;
    request_data.params.params.domain = {
      'by': this.dictionary.byIdOrName(domain_idenfitier),
      '_content': domain_idenfitier
    };
    this.performRequest(request_data);
  }

  // TODO: TO ugly
  setPassword(zimbra_id, password, callback) {
    const request_data = { };
    request_data.params = this.requestParams();
    request_data.request_name = "SetPassword";
    request_data.params.name = `${request_data.request_name}Request`;
    request_data.params.params = {
      id: zimbra_id,
      newPassword: password
    };
    request_data.callback = callback;
    const that = this;
    request_data.parse_response = function(data, _, callback){
      const response_object = data.response[0].SetPasswordResponse;
      if (response_object.message) {
        const err = {
          status: 500,
          statusText: response_object.message[0]._content,
          responseJSON: {}
        };
        return callback(that.handleError(err));
      } else {
        return callback(null, {});
      }
    };
    this.performRequest(request_data);
  }

  // TODO: Ugly
  getMailbox(zimbra_id, callback) {
    const request_data = { };
    request_data.params = this.requestParams();
    request_data.request_name = "GetMailbox";
    request_data.params.name = `${request_data.request_name}Request`;
    request_data.params.params = { mbox: { id: zimbra_id } };
    request_data.callback = callback;
    request_data.parse_response = function(data, _, callback){
      const response_object = data.get().GetMailboxResponse.mbox[0];
      const result = {
        mbxid: response_object.mbxid,
        account_id: response_object.id,
        size: response_object.s
      };
      return callback(null, result);
    };
    this.performRequest(request_data);
  }

}

if (typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = ZimbraAdminApi;
} else {
  global.window.ZimbraAdminApi = ZimbraAdminApi;
}

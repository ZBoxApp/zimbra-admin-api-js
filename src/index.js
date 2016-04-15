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

export default class ZimbraAdminApi {
  constructor(auth_object) {
    this.url = auth_object.url;
    this.user = auth_object.user;
    this.password = auth_object.password;
    this._client = new jszimbra.Communication({url: auth_object.url});
    this.parseAllResponse = this.parseAllResponse.bind(this);
    this.parseResponse = this.parseResponse.bind(this);
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

  parseResponse(data, obj, callback) {
    const resource = obj.resource.toLowerCase();
    const that = this;
    const response_name = that.dictionary.resourceResponseName(resource);
    const response_object = data.get()[obj.response_name][response_name][0];
    const result = that.dictionary.classFactory(resource, response_object);
    return callback(null, result);
  }

  parseRawResponse(data, obj, callback) {

  }


  parseAllResponse(data, obj, callback){
    const resource = obj.resource.toLowerCase();
    const that = this;
    const response_name = that.dictionary.resourceResponseName(resource);
    const response_object = data.get()[obj.response_name][response_name];
    const response_array = [];
    response_object.forEach((r) => {
      let element = that.dictionary.classFactory(resource, r);
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

  getAccount(identifier, callback) {
    this.get('Account', identifier, callback);
  }

  // attributes debe ser un arreglo de objetos:
  // resource_data.a = attributes
  // attributes = [ { n: 'NOMBRE_DEL_CAMPO_ZIMBRA', '_content': 'VALOR_DEL_CAMPO' } ]
  createAccount(name, password, attributes, callback) {
    let resource_data = {
      name: { '_content': name },
      password: { '_content': password },
      a: this.dictionary.attributesToArray(attributes)
    };
    this.create('Account', resource_data, callback);
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

  getAllDomains(callback) {
    this.getAll('Domain', callback);
  }

  getAllAccounts(callback) {
    this.getAll('Account', callback);
  }

  getAllDistributionLists(callback) {
    this.getAll('DistributionList', callback);
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


  //   const req_params =
  //   const that = this;
  //   this.client.getRequest({}, function(err, req) {
  //     if (err) return callback(this.handleError(err));
  //
  //     req.addRequest(req_params, function(err){
  //       if (err) return callback(that.handleError(err));
  //       that.client.send(req, function(err, data){
  //         if (err) return callback(that.handleError(err));
  //         const result = data.response[0].GetInfoResponse
  //         return callback(null, result);
  //       });
  //     });
  //   });
  // }

  // TODO: Fix this fucking code
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

  }

}

if (typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = ZimbraAdminApi;
} else {
  global.window.ZimbraAdminApi = ZimbraAdminApi;
}

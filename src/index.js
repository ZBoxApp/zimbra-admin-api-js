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

class ZimbraAdminApi {
  constructor(auth_object) {
    this.url = auth_object.url;
    this.user = auth_object.user;
    this.password = auth_object.password;
    this._client = new jszimbra.Communication({url: auth_object.url});
    this.default_params = { namespace: 'zimbraAdmin', params: { } };
    this.parseAllResponse = this.parseAllResponse.bind(this);
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

  makeRequest(request, resource, parse_response, callback) {
    let that = this;
    this.default_params.name = `${request}Request`;
    let request_object = that.buildRequest();
    request_object.addRequest(this.default_params, function(err){
      if (err) {
        return that.handleError(err);
      }
      let obj = new Object(self);
      obj.response_name = `${request}Response`;
      obj.param_object_name = resource.toLocaleLowerCase();
      that.client.send(request_object, function(err, data){
        if (err) return callback(err);
        parse_response(data, obj, callback);
      });
    });
  }

  parseResponse(err, data) {
    if (err) {
      return this.error(err);
    }

    let response_object = data.get()[this.response_name][this.param_object_name];
    return this.success(response_object);
  }


  parseAllResponse(data, obj, callback){
    const resource = obj.param_object_name.toLowerCase();
    const that = this;
    const response_name = that.dictionary.resourceResponseName(resource)
    const response_object = data.get()[obj.response_name][response_name];
    const response_array = [];
    response_object.forEach((r) => {
      let element = that.dictionary.classFactory(resource, r);
      response_array.push(element);
    });
    return callback(null, response_array);
  }

  getAll(resource, callback) {
    if (this.client.token) {
      this.makeRequest(`GetAll${resource}s`, resource, this.parseAllResponse, callback);
    } else {
      var that = this;
      let getAllCallback = function(err, response){
        if (err) return this.handleError(err);
        that.makeRequest(`GetAll${resource}s`, resource, that.parseAllResponse, callback);
      }
      this.login(getAllCallback);
    }
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

}

if (typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = ZimbraAdminApi;
} else {
  global.window.ZimbraAdminApi = ZimbraAdminApi;
}

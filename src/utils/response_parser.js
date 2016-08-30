// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

'use strict';

var Dictionary = require('./dictionary.js');
var ErrorBuilder = require('../zimbra/error.js');

class ResponseParser {

  static dictionary() {
    return new Dictionary();
  }

  static allResponse(data, request_data, callback){
    let result = null;
    const resource = request_data.resource.toLowerCase();
    const response_name = ResponseParser.dictionary().resourceResponseName(resource);
    const response_object = data.get()[request_data.response_name][response_name];
    const apiClient = request_data.client;
    if (apiClient.arrayAsObject) {
      result = ResponseParser.allResponseAsObject(response_object, resource, apiClient);
    } else {
      result = ResponseParser.allResponseAsArray(response_object, resource, apiClient);
    }
    return callback(null, result);
  }

  static allResponseAsArray(response_object, resource, apiClient) {
    const result = [];
    if (response_object) response_object.forEach((r) => {
      let element = ResponseParser.dictionary().classFactory(resource, r, apiClient);
      result.push(element);
    });
    return result;
  }

  static allResponseAsObject(response_object, resource, apiClient) {
    const result = {};
    if (response_object) response_object.forEach((r) => {
      const element = ResponseParser.dictionary().classFactory(resource, r, apiClient);
      if (apiClient.client.arrayAsObjectKey === 'name') {
        result[element.name] = element;
      } else {
        result[element.id] = element;
      }
    });
    return result;
  }

  static backupResponse(data, request_data, callback) {
    const response_object = data.get().BackupResponse.backup[0];
    return callback(null, response_object);
  };

  static batchResponse(data, callback) {
    const response_object = data.options.response.BatchResponse;
    if(response_object.Fault && response_object.Fault.length >= 1 ) {
      const errors = [];
      response_object.Fault.forEach((e) =>{
        errors.push(new ErrorBuilder(e));
      });
      response_object.errors = errors;
    }
    return callback(null, response_object);
  }

  static checkDomainMxRecordResponse(data, request_data, callback) {
    const response = data.get().CheckDomainMXRecordResponse;
    const result = {
      entry: response.entry[0] ? response.entry[0]._content : null,
      code: response.code[0] ? response.code[0]._content : null,
      message: response.message[0] ? response.message[0]._content : null,
    };
    return callback(null, result);
  }

  static countAccountResponse(data, request_data, callback) {
    const coses = data.get().CountAccountResponse.cos;
    const result = ResponseParser.dictionary().cosesToCountAccountObject(coses);
    return callback(null, result);
  }

  static delegateAuthResponse(data, _, callback) {
    const response_object = data.get().DelegateAuthResponse;
    const result = {
      authToken: response_object.authToken[0]._content,
      lifetime: response_object.lifetime
    };
    return callback(null, result);
  }

  static debugResponse(data, request_data, callback) {
    return callback(null, data.get());
  }

  // For requests that returns empty Object when Success
  static emptyResponse(data, request_data, callback){
    const response_object = data.get()[request_data.response_name];
    return callback(null, response_object);
  }

  static getAllVolumesResponse(data, request_data, callback) {
    const response_object = data.get()[request_data.response_name];
    if (!response_object.volume) return callback(null, {});
    const result = {};
    response_object.volume.forEach((volume) => {
      result[volume.name] = volume;
    });
    callback(null, result);
  }

  static getMailboxResponse (data, _, callback) {
    const response_object = data.get().GetMailboxResponse.mbox[0];
    const result = {
      mbxid: response_object.mbxid,
      account_id: response_object.id,
      size: response_object.s
    };
    return callback(null, result);
  }

  static getResponse(data, request_data, callback) {
    const resource = request_data.resource.toLowerCase();
    const response_name = ResponseParser.dictionary().resourceResponseName(resource);
    const response_object = data.get()[request_data.response_name][response_name][0];
    const result = ResponseParser.dictionary().classFactory(resource, response_object, request_data.client);
    return callback(null, result);
  }

  static grantsResponse(data, request_data, callback) {
    const result = {};
    const response_object = data.get().GetGrantsResponse;
    return callback(null, response_object);
  }

  static moveBlobsResponse(data, request_data, callback) {
    const response_object = data.get().MoveBlobsResponse;
    return callback(null, response_object);
  }

  static searchResponse(data, request_data, callback) {
    const resource_types = ResponseParser.dictionary().searchResponseTypes();
    const response_object = data.get()[request_data.response_name];
    const result = { total: response_object.searchTotal, more: response_object.more };
    resource_types.forEach((resource) => {
      if (typeof response_object[resource] !== 'undefined') {
        let resources = null;
        if (request_data.client.arrayAsObject) {
          resources = ResponseParser.allResponseAsObject(response_object[resource], resource, request_data, callback);
        } else {
          resources = ResponseParser.allResponseAsArray(response_object[resource], resource, request_data, callback);
        }
        // const resources = [];
        // response_object[type].forEach((resource) => {
        //   const object = ResponseParser.dictionary().classFactory(type, resource, request_data.client);
        //   resources.push(object);
        // });
        result[resource] = resources;
      }
    });
    return callback(null, result);
  }

  static setPasswordResponse(data, _, callback){
    const response_object = data.response[0].SetPasswordResponse;
    if (response_object.message) {
      const err = {
        status: 500,
        statusText: response_object.message[0]._content,
        responseJSON: {}
      };
      return callback(new ErrorBuilder(err));
    } else {
      return callback(null, {});
    }
  }

}

module.exports = ResponseParser;

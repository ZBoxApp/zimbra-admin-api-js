// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

export default class zimbraAdmin {
    constructor(connection, object_name) {
        this.zimbra = connection;
        this.object_name = object_name;
        this.param_object_name = object_name.toLocaleLowerCase();
        this.request = this.buildRequest();
        this.params = this.buildParams();
    }

    return_error(err){
      if (err) return error(err);
    }

    buildParams() {
      return { namespace: 'zimbraAdmin', params: { [this.param_object_name]: {} } };
    }

    buildRequest() {
      request = null;
      this.zimbra.getRequest({}, (err, req) => {
        if (err) return error(err);
        request = req;
      });
      return request;
    }

    makeRequest(request_name, parse_response, success, error) {
      const self = this;
      this.params.name = `${request_name}Request`;
      this.response_name = `${request_name}Response`;
      this.request.addRequest(this.params, function(err){
        if (err) {
          return error(err);
        }
        const obj = Object.create(self);
        obj.success = success;
        obj.error = error;
        self.zimbra.send(self.request, parse_response.bind(obj));
      });
    }

    parseResponse(err, data) {
      if (err) {
        return this.error(err);
      }

      let response_object = data.get()[this.response_name][this.param_object_name];
      return this.success(response_object);
    }

    parseAllResponse(err, data){
      if (err) {
        return this.error(err);
      }
      let response_object = data.get()[this.response_name][this.param_object_name];
      return this.success(response_object);
    }

    attributesHandler() {
      return {
        get(target, key) {
          if (target[key]) return target[key];
          if (target.a[key]) return target.a[key];
          return null;
        }
      };
    }

    requestParams() {
      return this.params.params[this.param_object_name];
    }

    getAll(success, error) {
      this.makeRequest(`GetAll${this.object_name}s`, this.parseAllResponse, success, error);
    }

    get(name, by, attrs, success, error) {
      var params = this.requestParams();
      params.attrs = attrs;
      params.by = by;
      params._content = name;
      this.makeRequest(`Get${this.object_name}`, this.parseResponse, success, error);
    }
}

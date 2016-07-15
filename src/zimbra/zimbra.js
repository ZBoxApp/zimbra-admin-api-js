// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

'use strict';

class Zimbra {
  constructor(resource_obj, zimbra_api_client) {
    this.name = resource_obj.name;
    this.id = resource_obj.id;
    this.attrs = this.buildAttrsMap(resource_obj.a);
    this.api = zimbra_api_client;
  }

  buildAttrsMap(obj_ary) {
    if (!obj_ary) return {};
    const attrs = {};
    obj_ary.forEach((r) => {
      if (attrs[r.n]) {
        const ary = [].concat.apply([],[attrs[r.n]]);
        attrs[r.n] = ary;
        attrs[r.n].push(r._content);
      } else {
        attrs[r.n] = r._content;
      }
    });
    return attrs;
  }

  buildRighTargetData() {
    const type = this.api.dictionary.classNameToZimbraType(this.constructor.name);
    return { type: type, identifier: this.id };
  }

  buildGranteeData(grantee_id, type) {
    return this.api.dictionary.buildGranteeData(grantee_id, type);
  }

  parseACL(acls) {
    const elements = [].concat.apply([], [acls]);
    const grantees = [];
    // Filter to remove undefined
    // http://stackoverflow.com/questions/28607451/removing-undefined-values-from-array
    elements.filter(Boolean).forEach((el) => {
      const grantee_data = el.split(/ /);
      grantees.push({id: grantee_data[0], type: grantee_data[1], right: grantee_data[2]});
    });
    return grantees;
  }

  // return ACLS for the Object
  getACLs(callback) {
    if (this.grants) return callback(null, this.grants);
    const that = this;
    this.api.getGrants(this.buildRighTargetData(), null, function(err, data){
      if (err) return callback(err);
      that.grants = data;
      callback(null, data);
    });
  }

  grantRight(grantee_data, right, callback = null){
    return this.api.grantRight(this.buildRighTargetData(), grantee_data, right, callback);
  }

  revokeRight(grantee_data, right_name, callback = null){
    return this.api.revokeRight(this.buildRighTargetData(), grantee_data, right_name, callback);
  }

}

module.exports = Zimbra;

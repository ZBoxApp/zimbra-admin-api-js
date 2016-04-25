// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

export default class Zimbra {
  constructor(resource_obj, zimbra_api_client) {
    this.name = resource_obj.name;
    this.id = resource_obj.id;
    this.attrs = this.buildAttrsMap(resource_obj.a);
    this.api = zimbra_api_client;
  }

  buildAttrsMap(obj_ary) {
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

  parseACL(acls) {
    const elements = [].concat.apply([], [acls]);
    const grantees = {};
    elements.forEach((el) => {
      grantee_data = el.split(/ /);
      grantees[grantee_data[0]] = {type: grantee_data[1], right: grantee_data[2]};
    });
    return grantees;
  }

}

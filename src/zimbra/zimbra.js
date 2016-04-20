// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

export default class Zimbra {
  constructor(resource_obj, zimbra_api_client) {
    this.name = resource_obj.name;
    this.id = resource_obj.id;
    this.attrs = this.buildAttrsMap(resource_obj.a);
    this.api = zimbra_api_client;
    // this.obj = resource_obj;
  }

  buildAttrsMap(obj_ary) {
    const attrs = {};
    obj_ary.forEach((r) => {
      if (attrs[r.n]) {
        const ary = [attrs[r.n]];
        attrs[r.n] = ary;
        attrs[r.n].push(r._content);
      } else {
        attrs[r.n] = r._content;
      }
    });
    return attrs;
  }

  // getZimbraACEs () {
  //   const result = {};
  //   this.attrs.zimbraACE.forEach((ace) => {
  //     const split = ace.split(/\s+/);
  //     result.granteeId = split[0];
  //     result.granteeType = split[1];
  //     result.granteeId = split[2];
  //   });
  // }

}

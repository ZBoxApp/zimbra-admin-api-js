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
      attrs[r.n] = r._content;
    });
    return attrs;
  }

}

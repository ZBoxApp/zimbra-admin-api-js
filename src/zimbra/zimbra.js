// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

export default class Zimbra {
  constructor(resource_obj) {
    this.name = resource_obj.name;
    this.id = resource_obj.id;
    this.attrs = resource_obj.a;
  }
}

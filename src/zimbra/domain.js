// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

export default class Domain {
  constructor(domain_obj) {
    this.name = domain_obj.name;
    this.id = domain_obj.id;
    this.attrs = domain_obj.a;
  }
}

// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

'use strict';

class Alias {
  constructor(resource_obj) {
    this.name = resource_obj.name;
    this.id = resource_obj.id;
    this.targetName = resource_obj.targetName;
  }
}

module.exports = Alias;
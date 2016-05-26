// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

'use strict';

var Zimbra = require('./zimbra.js');

class Cos extends Zimbra {
  constructor(cos_obj, zimbra_api_client) {
    super(cos_obj, zimbra_api_client);
  }
}

module.exports = Cos;
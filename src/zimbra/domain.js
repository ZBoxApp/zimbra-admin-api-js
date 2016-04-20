// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

import Zimbra from './zimbra.js';

export default class Domain extends Zimbra {
  constructor(domain_obj, zimbra_api_client) {
    super(domain_obj, zimbra_api_client);
  }

  countAccounts(callback) {
    this.api.countAccounts(this.id, function(e,d){
      if(e) return callback(e);
      return callback(null, d);
    });
  }

}

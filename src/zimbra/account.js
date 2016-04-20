// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

import Zimbra from './zimbra.js';

export default class Account extends Zimbra {
    constructor(account_obj, zimbra_api_client) {
      super(account_obj, zimbra_api_client);
    }

    cosName(callback) {
      if (this.attrs.zimbraCOSId) {
        api.getCos(this.attrs.zimbraCOSId, function(e,d){
          if (e) return callback(e);
          return callback(null, d.name);
        });
      } else {
        return null;
      }
    }

}

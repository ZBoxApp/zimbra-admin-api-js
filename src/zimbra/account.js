// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

import Zimbra from './zimbra.js';

export default class Account extends Zimbra {
    constructor(account_obj, zimbra_api_client) {
      super(account_obj, zimbra_api_client);
      this.domain = this.name.split(/@/)[1];
    }

    addAccountAlias(alias, callback) {
      this.api.addAccountAlias(this.id, alias, callback);
    }

    cosName(callback) {
      if (this.attrs.zimbraCOSId) {
        this.api.getCos(this.attrs.zimbraCOSId, function(e,d){
          if (e) return callback(e);
          return callback(null, d.name);
        });
      } else {
        return null;
      }
    }

    setPassword(password, callback) {
      this.api.setPassword(this.id, password, callback);
    }

    getMailbox(callback) {
      this.api.getMailbox(this.id, callback);
    }

    getMailboxSize(callback) {
      this.getMailbox(function(e,d){
        if (e) return callback(e);
        const size = ( d.size === undefined || d.size === null) ? 0 : d.size;
        return callback(null, size);
      });
    }

    removeAccountAlias(alias, callback) {
      this.api.removeAccountAlias(this.id, alias, callback);
    }

}

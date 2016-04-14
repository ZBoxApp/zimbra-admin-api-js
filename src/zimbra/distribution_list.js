// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

import Zimbra from './zimbra.js';

export default class DistributionList extends Zimbra {
  constructor(dl_obj) {
    super(dl_obj);
    this.members = this.parseMembers(dl_obj);
  }

  parseMembers(obj) {
    let members = [];
    if (obj.dlm) {
      obj.dlm.forEach((m) => {
        members.push(m._content);
      });
    }
    return members;
  }

}

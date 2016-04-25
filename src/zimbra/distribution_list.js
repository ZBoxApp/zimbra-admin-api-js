// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

import Zimbra from './zimbra.js';

export default class DistributionList extends Zimbra {
  constructor(dl_obj, zimbra_api_client) {
    super(dl_obj, zimbra_api_client);
    this.members = this.parseMembers(dl_obj);
  }

  // Add members to DL
  addMembers(members, callback) {
    this.api.addDistributionListMember(this.id, members, callback);
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

  // Remove members from DL
  removeMembers(members, callback) {
    this.api.removeDistributionListMember(this.id, members, callback);
  }

}

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

  // return the ID of the owner
  getOwners(callback) {
    if (this.owners) return callback(null, this.owners);
    const owners = [];
    const target_data = { type: 'dl', identifier: this.id };
    const that = this;
    this.api.getGrants(target_data, null, function(error, data){
      if (error) return callback(error);
      if (data.length > 0) data.forEach((grant) => {
        if (grant.isDistributionListOwnerGrant()) {
          owners.push({
            name: grant.grantee.name,
            id: grant.granteeId,
            type: grant.grantee.type
          });
        }
      });
      that.owners = owners;
      return callback(null, owners);
    });
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

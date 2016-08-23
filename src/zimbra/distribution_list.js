// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

'use strict';

var Zimbra = require('./zimbra.js');

class DistributionList extends Zimbra {
  constructor(dl_obj, zimbra_api_client) {
    super(dl_obj, zimbra_api_client);
    this.members = this.parseMembers(dl_obj);
    this.ownerRights = 'sendToDistList';
  }

  // //add alias to DL
  // addDistributionListAlias(alias, callback) {
  //   this.api.addDistributionListAlias(this.id, alias, callback);
  //}

  // Add members to DL
  addMembers(members, callback) {
    this.api.addDistributionListMember(this.id, members, callback);
  }

  // addOwner(account_id, callback) {
  //   const grantee_data = {
  //     'type': 'usr',
  //     'identifier': account_id
  //   }
  //   this.grantRight(grantee_data, this.ownerRights, callback);
  // }
  addOwner(account_id, callback) {
    const zimbraACES = this.attrs.zimbraACE ? [].concat.apply([], [this.attrs.zimbraACE]) : [];
    this.api.getAccount(account_id, (err, data) => {
      if (err) return callback(err);
      const account = data;
      const newZimbraACE = `${account.id} usr sendToDistList`;
      zimbraACES.push(newZimbraACE);
      const attrs = {zimbraACE: zimbraACES};
      return this.api.modifyDistributionList(this.id, attrs, callback);
    });
  }

  // return the ID of the owner
  getOwners(callback) {
    if (this.owners) return callback(null, this.owners);
    const that = this;
    this.getACLs(function(err, data){
      if (err) return callback(err);
      return callback(null, that.parseOwnerACLs(data));
    });
  }

  parseMembers(obj) {
    let members = [];
    if (obj.dlm) {
      obj.dlm.forEach((m) => {
        members.push(m._content);
      });
    } else if (this.attrs.zimbraMailForwardingAddress) {
      const fwd_address = [].concat.apply([], [this.attrs.zimbraMailForwardingAddress]);
      fwd_address.forEach((m) => {
        members.push(m);
      });
    }
    return members;
  }

  parseOwnerACLs(data) {
    const owners = [];
    data.forEach((grant) => {
      if (grant.isDistributionListOwnerGrant()) {
        owners.push({
          name: grant.grantee.name,
          id: grant.granteeId,
          type: grant.grantee.type
        });
      }
    });
    return owners;
  }

  // Remove members from DL
  removeMembers(members, callback) {
    this.api.removeDistributionListMember(this.id, members, callback);
  }

  // removeOwner(account_id, callback) {
  //   const grantee_data = {
  //     'type': 'usr',
  //     'identifier': account_id
  //   }
  //   this.revokeRight(grantee_data, this.ownerRights, callback);
  // }
  removeOwner(account_id, callback) {
    if (!this.attrs.zimbraACE) return this;
    const zimbraACES = [].concat.apply([], [this.attrs.zimbraACE]);
    this.api.getAccount(account_id, (err, account) => {
      if (err) return callback(err);
      const newACES = zimbraACES.filter((ace) =>{
        const granteeId = ace.split(/ /)[0];
        if (account.id !== granteeId) return true;
        return false;
      });
      const attrs = (newACES.length > 0) ? {zimbraACE: newACES} : {zimbraACE: ''};
      return this.api.modifyDistributionList(this.id, attrs, callback);
    });
  }

  rename(new_name, callback) {
    this.api.renameDistributionList(this.id, new_name, callback);
  }


}

module.exports = DistributionList;

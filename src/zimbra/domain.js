// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

import Zimbra from './zimbra.js';

export default class Domain extends Zimbra {
  constructor(domain_obj, zimbra_api_client) {
    super(domain_obj, zimbra_api_client);
    this.domainAdminRights = 'domainAdminRights';
  }

  // TODO: Too ugly code
  addAdmin(account_id, callback) {
    const request_data = {};
    const grantee_data = { 'type': 'usr', 'identifier': account_id };
    const modifyAccountRequest = this.api.modifyAccount(account_id, { zimbraIsDelegatedAdminAccount: 'TRUE' });
    const grantRightRequest = this.grantRight(grantee_data, this.domainAdminRights);
    request_data.requests = [modifyAccountRequest, grantRightRequest];
    request_data.batch = true;
    request_data.callback = function(err, data) {
      if (err) return callback(err);
      callback(null, data.GrantRightResponse);
    };
    this.api.performRequest(request_data);
  }

  // TODO: Fix this fucking ugly code
  getAdmins(callback) {
    const that = this;
    const admins_ids = this.getAdminsIdsFromGrants();
    const query = this.makeAdminIdsQuery(admins_ids);
    return this.api.getAllAccounts(callback, {query: query});
  }

  // Return the ZimbraId if the grantee have the domainAdminRights right
  // Grant.right_name() == domainAdminRights
  getAdminsIdsFromGrants() {
    const ids = [];
    this.parseACL(this.attrs.zimbraACE).forEach((grantee) => {
      if (grantee.right === this.domainAdminRights) ids.push(grantee.id);
    });
    return ids;
  }

  getAllDistributionLists(callback) {
    let query_object = { domain: this.name };
    this.api.getAllDistributionLists(function(e,d){
      if (e) return callback(e);
      if (d.total === 0) return callback(null, []);
      return callback(null, d.dl);
    }, query_object);
  }

  checkMxRecord(callback) {
    return this.api.checkDomainMxRecord(this.id, callback);
  }

  countAccounts(callback) {
    const maxAccountsByCos = this.maxAccountsByCos();
    this.api.countAccounts(this.id, function(e,d){
      if(e) return callback(e);
      if (maxAccountsByCos) Object.entries(d).forEach((cos) => {
        cos[1].limit = maxAccountsByCos[cos[1].id];
      });
      return callback(null, d);
    });
  }

  makeAdminIdsQuery(ids) {
    let query = "(|";
    ids.forEach((id) => {
        const zimbra_id = `(zimbraId=${id})`;
        query += zimbra_id;
      });
    query += ")";
    return query;
  }

  maxAccountsByCos() {
    const results = {};
    if  (typeof this.attrs.zimbraDomainCOSMaxAccounts === 'undefined') return null;
    // zimbraDomainCOSMaxAccounts can be only a String
    // so we force it into an Array
    const accounts_limits = [].concat.apply([], [this.attrs.zimbraDomainCOSMaxAccounts]);
    accounts_limits.forEach((cos) => {
      const split = cos.split(/:/);
      results[split[0]] = parseInt(split[1]);
    });
    return results;
  }

  removeAdmin(account_id, callback) {
    const grantee_data = {
      'type': 'usr',
      'identifier': account_id
    };
    this.revokeRight(grantee_data, this.domainAdminRights, callback);
  }

}

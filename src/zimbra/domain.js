// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

import Zimbra from './zimbra.js';

export default class Domain extends Zimbra {
  constructor(domain_obj, zimbra_api_client) {
    super(domain_obj, zimbra_api_client);
    this.domainAdminRights = 'domainAdminRights';
  }

  addAdmin(account_id, callback) {
    const grantee_data = this.buildGranteeData(account_id, 'Account');
    this.grantRight(grantee_data, this.domainAdminRights, callback);
  }

  // TODO: Fix this fucking ugly code
  getAdmins(callback) {
    const that = this;
    this.getAdminsIdsFromGrants(function(e,d){
      if (e) return callback(e);
      if (d.length < 1) return callback(null, []);
      let query = "(|";
      d.forEach((id) => {
        const zimbra_id = `(zimbraId=${id})`;
        query += zimbra_id;
      });
      query += ")";
      that.api.getAllAccounts(function(e,d){
        if (e) return callback(e);
        if (d.total > 0) return callback(null, d.account);
        return callback(null, []);
      }, {query: query});
    });
  }

  // Return the ZimbraId if the grantee have the domainAdminRights right
  // Grant.right_name() == domainAdminRights
  getAdminsIdsFromGrants(callback) {
    const ids = [];
    this.getACLs(function(err, data){
      if (err) return callback(err);
      data.forEach((grant) => {
        if (grant.isDomainAdminGrant()) ids.push(grant.granteeId);
      });
      return callback(null, ids);
    });
  }

  getAllDistributionLists(callback) {
    let query_object = { domain: this.name };
    this.api.getAllDistributionLists(function(e,d){
      if (e) return callback(e);
      if (d.total === 0) return callback(null, []);
      return callback(null, d.dl);
    }, query_object);
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

}

// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

'use strict';

var Zimbra = require('./zimbra.js');

class Domain extends Zimbra {
  constructor(domain_obj, zimbra_api_client) {
    super(domain_obj, zimbra_api_client);
    this.domainAdminRights = 'domainAdminRights';
    this.checkAliasDomain();
  }

  // TODO: Too ugly code
  addAdmin(account_id, coses, callback) {
    if (!coses) coses = [];
    const request_data = {};
    const grantee_data = { 'type': 'usr', 'identifier': account_id };
    const specialRighsReqs = this.grantSpecialDomainRights(grantee_data);
    const cosRights = this.assignCosRights(grantee_data, coses, null);
    const rightReqs = specialRighsReqs.concat(cosRights.requests);
    this.addDelegatedAttributeToAccount(account_id, (err,data) => {
      if (err) return callback(err);
      this.api.makeBatchRequest(rightReqs, (err, data) => {
        if (err) return callback(err);
        return this.api.getDomain(this.id, callback);
      }, {onError: 'continue'});
    });
  }

  // This function grants several rights needed to manage the domain, as:
  // * access to modify DLs owners,
  // * access to modify domain Amavis Lists
  // * access to add other domain admins
  // * access to modify account cos
  grantSpecialDomainRights(grantee_data) {
    const requests = [];
    requests.push(this.grantRight(grantee_data, {'_content': this.domainAdminRights, canDelegate: 1}));
    requests.push(this.grantRight(grantee_data, {'_content': 'set.dl.zimbraACE', canDelegate: 1}));
    requests.push(this.grantRight(grantee_data, {'_content': 'set.domain.amavisWhitelistSender', canDelegate: 1}));
    requests.push(this.grantRight(grantee_data, {'_content': 'set.domain.amavisBlacklistSender', canDelegate: 1}));
    return requests;
  }

  addDelegatedAttributeToAccount(account_id, callback) {
    this.api.modifyAccount(account_id, { zimbraIsDelegatedAdminAccount: 'TRUE' }, (err, data) => {
      if (err) return callback(err);
      return callback(null, data);
    });
  }

  // This functions add the rights to the domain admin
  // to be able to change the accounts cos
  assignCosRights(grantee_data, coses, callback, revoke = false) {
    const request_data = {};
    request_data.requests = this.buildCosesGrantsRequest(coses, grantee_data, revoke);
    request_data.batch = true;
    request_data.callback = callback;
    return this.api.performRequest(request_data);
  }

  buildCosesGrantsRequest(coses, grantee_data, revoke = false) {
    if (!coses) coses = [];
    const requests = [];
    const right = {'_content': 'assignCos'};
    coses.forEach((c) => {
      const target_data = { type: 'cos', identifier: c };
      let grant = null;
      if (revoke) {
       grant = this.api.revokeRight(target_data, grantee_data, 'assignCos');
      } else {
        grant = this.api.grantRight(target_data, grantee_data, right);
      }
      requests.push(grant);
    });
    return requests;
  }

  checkAliasDomain() {
    this.isAliasDomain = this.attrs.zimbraDomainType === 'alias' ? true : false;
    const masterDomain = this.attrs.zimbraMailCatchAllForwardingAddress;
    if (this.isAliasDomain && masterDomain) {
      this.masterDomainName = masterDomain.split(/@/)[1];
    }
    return true;
  }

  // TODO: Fix this fucking ugly code
  getAdmins(callback) {
    const that = this;
    const admins_ids = this.getAdminsIdsFromGrants(this.attrs.zimbraACE);
    const query = this.makeAdminIdsQuery(admins_ids);
    return this.api.getAllAccounts({query: query}, callback);
  }

  // Return the ZimbraId if the grantee have the domainAdminRights right
  // Grant.right_name() == domainAdminRights
  getAdminsIdsFromGrants(zimbraACES) {
    const ids = [];
    const regex = new RegExp(`${this.domainAdminRights}$`);
    this.parseACL(zimbraACES).forEach((grantee) => {
      if (regex.test(this.domainAdminRights)) ids.push(grantee.id);
    });
    return ids;
  }

  getAllDistributionLists(callback) {
    let query_object = { domain: this.name };
    this.api.getAllDistributionLists(query_object, function(e,d){
      if (e) return callback(e);
      if (d.total === 0) return callback(null, []);
      return callback(null, d.dl);
    });
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

  removeAdmin(account_id, coses, callback) {
    const grantee_data = {
      'type': 'usr',
      'identifier': account_id
    };
    this.revokeRight(grantee_data, this.domainAdminRights, (err, data) => {
      if (err) return callback(err);
      this.assignCosRights(grantee_data, coses, callback, true);
    });
  }

}

module.exports = Domain;

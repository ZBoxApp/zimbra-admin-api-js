// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

import Domain from './../zimbra/domain.js';
import Account from './../zimbra/account.js';
import Alias from './../zimbra/alias.js';
import Cos from './../zimbra/cos.js';
import Grant from './../zimbra/grant.js';
import DistributionList from './../zimbra/distribution_list.js';

export default class Dictionary {
  constructor() {
    this.zimbra_resources = this.ZimbraResources();
  }

  resourceToClass (resource) {
    return this.zimbra_resources[resource.toLowerCase()].class_name;
  }

  // Check if resource_identifier is a ZimbraId (UUID)
  // and if it is return 'by': 'id' to params.
  byIdOrName (resource_identifier) {
    let uuid_regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (resource_identifier.match(uuid_regex)) return 'id';
    return 'name';
  }

  // Takes an object an return an array
  // {size: 20, age: 30} => [ {n: size, _content: 20}, {n: age, _content: 30}]
  attributesToArray (attributes) {
    if ($.isEmptyObject(attributes)) return [];
    const result = [];
    const map = new Map(Object.entries(attributes));
    map.forEach((key, value) => {
      result.push({ 'n': value, '_content': key });
    });
    return result;
  }

  classFactory (resource, object, client) {
    const class_name = this.resourceToClass(resource.toLowerCase());
    return new class_name(object, client);
  }

  resourceResponseName (resource) {
    return this.zimbra_resources[resource.toLowerCase()].response_name;
  }

  searchResponseTypes () {
    const result = [];
    const that = this;
    Object.keys(this.zimbra_resources).forEach((k) => {
      result.push(that.zimbra_resources[k].response_name);
    });
    return result;
  }

  ZimbraResources() {
    return {
      domain: {
        class_name: Domain,
        response_name: 'domain'
      },
      account: {
        class_name: Account,
        response_name: 'account'
      },
      alias: {
        response_name: 'alias',
        class_name: Alias,
      },
      cos: {
        class_name: Cos,
        response_name: 'cos'
      },
      distributionlist: {
        class_name: DistributionList,
        response_name: 'dl'
      },
      dl: {
        class_name: DistributionList,
        response_name: 'dl'
      },
      grant: {
        class_name: Grant,
        response_name: 'grant'
      }
    };
  }

}

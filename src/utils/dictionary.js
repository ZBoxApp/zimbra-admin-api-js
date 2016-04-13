// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

import Domain from './../zimbra/domain.js';
import Account from './../zimbra/account.js';
import DistributionList from './../zimbra/distribution_list.js';

export default class Dictionary {
  constructor() {
    this.zimbra_resources = this.ZimbraResources();
  }

  resourceToClass (resource) {
    return this.zimbra_resources[resource.toLowerCase()].class_name;
  }

  classFactory (resource, object) {
    const class_name = this.resourceToClass(resource.toLowerCase());
    return new class_name(object);
  }

  resourceResponseName (resource) {
    return this.zimbra_resources[resource.toLowerCase()].response_name;
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
      distributionlist: {
        class_name: DistributionList,
        response_name: 'dl'
      }
    };
  }

}

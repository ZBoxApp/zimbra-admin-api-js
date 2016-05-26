// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

'use strict';

class Grant {
  constructor(grant) {
    this.grantee = grant.grantee[0];
    this.target = grant.target[0];
    this.right = grant.right[0];
    this.rightName = this.right._content;
    this.granteeId = this.grantee.id;
  }

  isDomainAdminGrant() {
    if (this.rightName === 'domainAdminRights') return true;
    return false;
  }

  isDistributionListOwnerGrant() {
    if (this.rightName === 'sendToDistList') return true;
    return false;
  }

}

module.exports = Grant;
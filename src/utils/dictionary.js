// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

'use strict';

var Domain = require('./../zimbra/domain.js');
var Account = require('./../zimbra/account.js');
var Alias = require('./../zimbra/alias.js');
var Cos = require('./../zimbra/cos.js');
var Grant = require('./../zimbra/grant.js');
var DistributionList = require('./../zimbra/distribution_list.js');

class Dictionary {
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
    if (this.isEmptyObject(attributes)) return [];
    const result = [];
    const map = new Map(Object.entries(attributes));
    map.forEach((key, value) => {
      if (this.checkIfArray(key)) {
        key.forEach((e) => {
          result.push({ 'n': value, '_content': e });
        });
      } else {
        result.push({ 'n': value, '_content': key });
      }
    });
    return result;
  }

  buildTargetGrantee(target_data, grantee_data) {
    let target = null, grantee = null;
    if (target_data) target = {
      'type': target_data.type,
      'by': this.byIdOrName(target_data.identifier),
      '_content': target_data.identifier
    };
    if (grantee_data) grantee =
    {
      'type': grantee_data.type,
      'by': this.byIdOrName(grantee_data.identifier),
      'all': 1,
      '_content': grantee_data.identifier
    };
    return([target, grantee]);
  }

  buildGranteeData(grantee_id, type) {
    return {
      'type': type,
      'by': this.byIdOrName(grantee_id),
      'all': 1,
      '_content': grantee_id,
      'identifier': grantee_id
    };
  }

  classFactory (resource, object, client) {
    const class_name = this.resourceToClass(resource.toLowerCase());
    return new class_name(object, client);
  }

  checkIfArray(object) {
    let result = false;
    if( Object.prototype.toString.call(object) === '[object Array]' ) {
      result = true;
    }
    return result;
  }

  // This return a string or array of objects
  // useful for Zimbra functions that works with both
  convertToZimbraArray (object, attribute) {
    const elements = [].concat.apply([], [object]);
    const result = [];
    elements.forEach((el) => {
      const obj = {};
      if (attribute) obj[attribute] = el;
      if (!attribute) obj['_content'] = el;
      result.push(obj);
    });
    return result;
  }

  cosesToCountAccountObject (coses) {
    const result = {};
    if (typeof coses !== 'undefined') coses.forEach((cos) => {
      result[cos.name] = {
        used: parseInt(cos._content),
        id: cos.id
      };
    });
    return result;
  }

  isEmptyObject(obj) {
    // null and undefined are "empty"
    if (obj === null) return true;

    // Assume if it has a length property with a non-zero value
    // that that property is correct.
    if (obj.length > 0)    return false;
    if (obj.length === 0)  return true;

    // Otherwise, does it have any properties of its own?
    // Note that this doesn't handle
    // toString and valueOf enumeration bugs in IE < 9
    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) return false;
    }
    return true;
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

  classNameToZimbraType(class_name) {
    const obj = { 'Account': 'account', 'Domain': 'domain',
                  'Alias': 'alias', 'DistributionList': 'dl'};
    return obj[class_name];
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

module.exports = Dictionary;

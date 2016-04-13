// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

import ZimbraAdmin from './zimbra_admin.jsx';

export default class DistributionList extends ZimbraAdmin {
    constructor(connection, name, id, attrs) {
      super(connection, 'DistributionList');
      this.param_object_name = 'dl';
      this.name = name;
      this.id = id;
      this.attrs = attrs;
    }




}

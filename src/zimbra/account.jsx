// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

import ZimbraAdmin from './zimbra_admin.jsx';

export default class Account extends ZimbraAdmin {
    constructor(connection, name, id, attrs) {
      super(connection, 'Account');
      this.name = name;
      this.id = id;
      this.attrs = attrs;
    }




}

// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

import ZimbraAdmin from './zimbra_admin.jsx';

export default class Domain extends ZimbraAdmin {
    constructor(connection) {
      super(connection, 'Domain');
    }
}

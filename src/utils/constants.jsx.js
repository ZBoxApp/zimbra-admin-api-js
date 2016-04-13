// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See License.txt for license information.

import keyMirror from 'keymirror';

export default {
    ActionTypes: keyMirror({
        RECEIVED_ERROR: null
    }),

    PayloadSources: keyMirror({
        SERVER_ACTION: null,
        VIEW_ACTION: null
    }),

    RESERVED_TEAM_NAMES: [
        'www',
        'web',
        'admin',
        'support',
        'notify',
        'test',
        'demo',
        'mail',
        'team',
        'channel',
        'internal',
        'localhost',
        'dockerhost',
        'stag',
        'post',
        'cluster',
        'api'
    ],
    RESERVED_USERNAMES: [
        'admin',
        'root'
    ],
    MONTHS: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Juio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    KeyCodes: {
        UP: 38,
        DOWN: 40,
        LEFT: 37,
        RIGHT: 39,
        BACKSPACE: 8,
        ENTER: 13,
        ESCAPE: 27,
        SPACE: 32,
        TAB: 9
    }
};

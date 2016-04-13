// Copyright (c) 2016 ZBox, Spa. All Rights Reserved.
// See LICENSE.txt for license information.

import $ from 'jquery';
import jszimbra from 'js-zimbra';
import Domain from '../zimbra/domain.jsx';
import Account from '../zimbra/account.jsx';

let domain;
let account;

// función que maneja el error como corresponde
function handleError(methodName, err) {
    var e = null;
    try {
        e = JSON.parse(err);
    } catch (parseError) {
        e = null;
    }

    console.error(methodName, e); //eslint-disable-line no-console

    // Aqui deberiamos revisar si falta hacer login nuevamente

    return e;
}

function error(err) {
  console.error(err);
}

function success(data) {
  console.log("SUCCESS");
  return data;
}

export function getClientConfig(success, error) {
    return $.ajax({
        url: 'config/config.json',
        dataType: 'json',
        success,
        error: function onError(xhr, status, err) {
            var e = handleError('getClientConfig', err);
            error(e);
        }
    });
}

export function login(username, secret, success, error) {
    const zimbra = new jszimbra.Communication({
        url: global.window.manager_config.zimbraUrl
    });

    zimbra.auth({
        username,
        secret,
        isPassword: true,
        isAdmin: true
    }, (err) => {
        if (err) {
            var e = handleError('login', err);
            return error(e);
        }

        // aqui deberiamos inicializar todas las apis
        domain = new Domain(zimbra);
        account = new Account(zimbra);

        return success();
    });
}

export function getDomain(name, by, attrs, success, error) {
  console.log(domain);
    if (domain) {
        return domain.get(name, by, attrs,
            (data) => {
                // aqui formateamos la data que viene en "data"
                const nuevoObj = {
                  dominio: 'el nombre del dominio'
                }
                return success(nuevoObj);
            },
            (err) => {
                var e = handleError('getDomain', err);
                error(e);
            });
    }

    // probablemente esto lo que deba hacer es forzar un login
    return error({message: 'Domain not initialized'});
}

export function getAllDomains(success, error) {
    if (domain) {
        return domain.getAll(
            (data) => {
                return success(data);
            },
            (err) => {
                var e = handleError('getDomain', err);
                error(e);
            });
    }

    // probablemente esto lo que deba hacer es forzar un login
    return error({message: 'Domain not initialized'});
}

export function getAllAccounts(success, error) {
    if (account) {
        return account.getAll(
            (data) => {
                return success(data);
            },
            (err) => {
                var e = handleError('getDomain', err);
                error(e);
            });
    }

    // probablemente esto lo que deba hacer es forzar un login
    return error({message: 'Domain not initialized'});
}

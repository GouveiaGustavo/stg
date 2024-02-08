'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class User extends Model {
    static get table(){
        return 'user';  
    }

    static get primaryKey () {
        return 'id'
    }

    tokens(){
        return this.hasMany('App/Models/Token','id','user_id');
    }
}

module.exports = User
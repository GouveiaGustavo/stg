'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class DriveSchema extends Schema {
  up () {
    this.create('drive', (table) => {
      table.increments()
      table.string('name', 100).notNullable()
      table.string('alias', 100).notNullable()
      table.string('apikey', 100).notNullable()
      table.boolean('enable', 1).notNullable().defaultTo(1)
      table.timestamps()
    })
  }

  down () {
    this.drop('drive')
  }
}

module.exports = DriveSchema

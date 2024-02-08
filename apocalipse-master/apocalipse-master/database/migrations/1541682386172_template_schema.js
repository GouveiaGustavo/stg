'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class TemplateSchema extends Schema {
  up () {
    this.create('template', (table) => {
      table.increments()
      table.integer('drive_id').unsigned()
      table.foreign('drive_id').references('id').inTable('drive') 
      table.string('name', 100).notNullable()
      table.string('templatedrive_id', 100).notNullable()
      table.json('config')
      table.boolean('enable', 1).notNullable().defaultTo(1)
      table.timestamps()
    })
  }

  down () {
    this.drop('template')
  }
}

module.exports = TemplateSchema

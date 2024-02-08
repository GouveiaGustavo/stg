'use strict';

/*
|--------------------------------------------------------------------------
| Providers
|--------------------------------------------------------------------------
|
| Providers are building blocks for your Adonis app. Anytime you install
| a new Adonis specific package, chances are you will register the
| provider here.
|
*/
const providers = [
  '@adonisjs/framework/providers/AppProvider',
  '@adonisjs/framework/providers/ViewProvider',
  '@adonisjs/lucid/providers/LucidProvider',
  '@adonisjs/bodyparser/providers/BodyParserProvider',
  '@adonisjs/cors/providers/CorsProvider',
  '@adonisjs/shield/providers/ShieldProvider',
  '@adonisjs/session/providers/SessionProvider',
  '@adonisjs/auth/providers/AuthProvider',
  '@adonisjs/session/providers/SessionProvider',
  '@adonisjs/validator/providers/ValidatorProvider'
];

/*
|--------------------------------------------------------------------------
| Ace Provider by
|--------------------------------------------------------------------------
|
| Ace providers are required only when running ace commands. For example
| Providers for migrations, tests etc.
|
*/
const aceProviders = [
  '@adonisjs/lucid/providers/MigrationsProvider',
  '@adonisjs/vow/providers/VowProvider'
];

/*
|--------------------------------------------------------------------------
| Aliases
|--------------------------------------------------------------------------
|
| Aliases are short unique names for IoC container bindings. You are free
| to create your own aliases.
|
| For example:
|   { Route: 'Adonis/Src/Route' }
|
*/
const aliases = {
  LogHelper: 'App/Helpers/LogHelper',
  TextHelper: 'App/Helpers/TextHelper',
  PabloEscobarHelper: 'App/Helpers/PabloEscobarHelper',
  ArrayHelper: 'App/Helpers/ArrayHelper',
  XavierService: 'App/Providers/XavierService',
  HomerSimpsonService: 'App/Providers/HomerSimpsonService',
  PabloEscobarService: 'App/Providers/PabloEscobarService',
  RobinHoodService: 'App/Providers/RobinHoodService',
  ApiInterceptorService: 'App/Providers/ApiInterceptorService',
  HomerSimpsonService: 'App/Providers/HomerSimpsonService',
  FileExportHelper: 'App/Helpers/FileExportHelper',
  AwsDriver: 'App/Helpers/AwsDriver',
  ValidationHelper: 'App/Helpers/ValidationHelper',
  SurveyHelper: 'App/Helpers/SurveyHelper',
  InpayService: 'App/Providers/InpayService',
  FileDetailMessage: 'App/Helpers/FileDetailMessage',
  GalactusService: 'App/Providers/GalactusService'
};

/*
|--------------------------------------------------------------------------
| Commands
|--------------------------------------------------------------------------
|
| Here you store ace commands for your package
|
*/
const commands = ['App/Commands/TimezoneTester'];

module.exports = { providers, aceProviders, aliases, commands };

module BwdServer

(* open Giraffe.Core *)
(* open Giraffe.ResponseWriters *)

(* open Microsoft.AspNetCore.Http *)
open Giraffe
open LibExecution
open FSharp.Control.Tasks

open System
(* open System.Security.Claims *)
(* open System.Threading *)
open Microsoft.AspNetCore.Builder
open Microsoft.AspNetCore.Hosting
open Microsoft.AspNetCore.Http
(* open Microsoft.AspNetCore.Http.Features *)
(* open Microsoft.AspNetCore.Authentication *)
open Microsoft.Extensions.Hosting
(* open Microsoft.AspNetCore.Authentication.Cookies *)
(* open Microsoft.Extensions.Configuration *)
open Microsoft.Extensions.Logging
open Microsoft.Extensions.DependencyInjection

let runAsync e =
  fun (next: HttpFunc) (ctx: HttpContext) ->
    task {
      let fizzboom = LibExecution.Interpreter.runJSON e
      return! text fizzboom next ctx
    }

let errorHandler (ex: Exception) (logger: ILogger) =
  logger.LogError(EventId(), ex, "An unhandled exception has occurred while executing the request.")
  clearResponse
  >=> setStatusCode 500
  >=> text ex.Message

let webApp =
  choose [ GET
           >=> choose [ route "/fizzbuzz"
                        >=> runAsync Interpreter.fizzbuzz
                        route "/fizzboom"
                        >=> runAsync Interpreter.fizzboom ] ]

let configureApp (app: IApplicationBuilder) =
  app.UseDeveloperExceptionPage().UseGiraffeErrorHandler(errorHandler).UseGiraffe webApp

let configureServices (services: IServiceCollection) = services.AddGiraffe() |> ignore



[<EntryPoint>]
let main _ =
  Host.CreateDefaultBuilder()
      .ConfigureWebHostDefaults(fun webHostBuilder ->
      webHostBuilder.Configure(configureApp).ConfigureServices(configureServices).UseUrls("http://*:9001")
      (* .ConfigureLogging(configureLogging) *)
      |> ignore).Build().Run()
  0

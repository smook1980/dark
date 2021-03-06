open Core_kernel
open Libcommon

let has_inited : bool ref = ref false

let init log_level log_format extra_fns =
  if not !has_inited
  then (
    Caml.print_endline "Libexecution Initialization Begins" ;
    Printexc.record_backtrace true ;
    Exn.initialize_module () ;
    Log.init ~level:log_level ~format:log_format () ;
    Libs.init (Builtin_libs.fns @ extra_fns) ;
    Log.infO "Libexecution" ~data:"Initialization Complete" ;
    has_inited := true )

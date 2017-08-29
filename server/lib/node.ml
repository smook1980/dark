open Core
open Types

module RT = Runtime

type dval = RT.dval [@@deriving show, yojson]
type param = RT.param [@@deriving show, yojson]
type argument = RT.argument [@@deriving show, yojson]

module ArgMap = RT.ArgMap
type arg_map = RT.arg_map

module DvalMap = RT.DvalMap
type dval_map = RT.dval_map

module IdMap = String.Map
type id_map = id IdMap.t

(* For serializing to json only *)
type valuejson = { value: string
                 ; tipe: string [@key "type"]
                 ; json: string
                 } [@@deriving yojson, show]
type nodejson = { name: string
                ; id: id
                ; tipe: string [@key "type"]
                ; x: int
                ; y: int
                ; live: valuejson
                ; parameters: param list
                ; arguments: argument list
                } [@@deriving yojson, show]
type nodejsonlist = nodejson list [@@deriving yojson, show]


class virtual node id loc =
  object (self)
    val id : id = id
    val mutable loc : loc = loc
    method virtual name : string
    method virtual tipe : string
    method virtual execute : dval_map -> dval
    method id = id
    method is_page = false
    method is_datasink = false
    method is_datasource = false
    method parameters : param list = []
    method has_parameter (paramname : string) : bool =
      List.exists ~f:(fun p -> p.name = paramname) self#parameters
    method arguments = RT.ArgMap.empty
    method set_arg (name: string) (value: argument) : unit =
      Exception.raise "This node doesn't support set_arg"
    method clear_args : unit =
      Exception.raise "This node doesn't support clear_args"
    method delete_arg (name: string) : unit =
      Exception.raise "This node doesn't support delete_arg"
    method edges : id_map = IdMap.empty
    method update_loc _loc : unit =
      loc <- _loc
    method to_frontend (value, tipe, json) : nodejson =
      { name = self#name
      ; id = id
      ; tipe = self#tipe
      ; x = loc.x
      ; y = loc.y
      ; live = { value = value ; tipe = tipe; json = json }
      ; parameters = self#parameters
      ; arguments = List.map
            ~f:(fun p -> RT.ArgMap.find_exn self#arguments p.name)
            self#parameters
      }
  end


let equal_node (a:node) (b:node) =
  a#id = b#id

let show_node (n:node) =
  show_nodejson (n#to_frontend ("test", "test", "test"))

(* ------------------ *)
(* Nodes that appear in the graph *)
(* ------------------ *)
class value strrep id loc =
  object
    inherit node id loc
    val expr : dval = RT.parse strrep
    method name : string = strrep
    method tipe = "value"
    method execute (_: dval_map) : dval = expr
  end

class virtual has_arguments id loc =
  object (self)
    inherit node id loc
    val mutable args : arg_map = RT.ArgMap.empty
    method arguments = args
    method set_arg (name: string) (value: argument) : unit =
      args <- ArgMap.change args name (fun _ -> Some value)
    method clear_args : unit =
      args <- ArgMap.map args (fun _ -> RT.blank_arg)
    method delete_arg (name: string) : unit =
      self#set_arg name RT.blank_arg
  end

class func n id loc =
  object (self)
    inherit has_arguments id loc
    initializer
      args <-
        (Libs.get_fn_exn n).parameters
        |> List.map ~f:(fun (p: param) -> (p.name, RT.AConst DIncomplete))
        |> RT.ArgMap.of_alist_exn

    (* Throw an exception if it doesn't exist *)
    method private fn = (Libs.get_fn_exn n)
    method parameters : param list = self#fn.parameters
    method name = self#fn.name
    method execute (args : dval_map) : dval =
      RT.exe self#fn args
    method! is_page = self#name = "Page_page"
    method tipe = if String.is_substring ~substring:"page" self#name
      then self#name
      else "function"
  end

class datastore table id loc =
  object
    inherit node id loc
    val table : string = table
    method execute (_ : dval_map) : dval = DStr "todo datastore execute"
    method name = "DS-" ^ table
    method tipe = "datastore"
  end

(* ----------------------- *)
(* Anonymous functions *)
(* ----------------------- *)

(* Anonymous functions are created automatically to allow users to use
   higher-order functions. Consider String.map, which a string and
   Char.to_upper, which is (Char->Char). String.map is (String->String).

   To begin with, String.map has a parameter `f` which needs a value.
   Then Char.to_upper needs to receive a parameter, and also return it's
   result.

   The parameter to String.map is an anon_box. The box wraps the
   computation fr String.map.

   An anon_box works with an anon_executor. This is a way of getting the
   computation into the graph: it has a (currently just one I think)
   parameters, that map to the function in the anon function, and
   receives its output as well. *)


class anon_box id (executor: dval -> dval) loc =
  object
    inherit has_arguments id loc
    method name = "<anonbox>"
    method execute (_: dval_map) : dval =
      DAnon (id, executor)
    method tipe = "definition"
    method! parameters = []
  end

(* the function definition of the anon *)
class anon_executor id loc =
  object
    inherit has_arguments id loc
    method name = "<anonexe>"
    method execute (args: dval_map) : dval =
      DvalMap.find_exn args "return"
    method tipe = "definition"
    method! parameters = [Lib.req "return" RT.tAny]
  end

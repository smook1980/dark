# Dockerfile for the main container of the cron-checker service

FROM dark-ocaml-service:latest

COPY --chown=dark . ./

RUN ./scripts/support/check-linked-libs bin/cron_checker.exe

CMD "./gcp-run-cronchecker"

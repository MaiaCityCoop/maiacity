# The dry run's trace of run.sh (intent cb52fbd9; BASH_ENV): the job's own shell, not the bash scripts it runs, writes
# each step it takes to DRY_STATE/trace, so a hang is told with the step it hung at.
if [ -z "${DRY_TRACING:-}" ]; then
  export DRY_TRACING=1
  exec 9>>"$DRY_STATE/trace"
  BASH_XTRACEFD=9
  set -x
fi

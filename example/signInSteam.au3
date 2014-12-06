#include <lib\au3record.au3>
#include "md5.au3"
#include <Array.au3>
#include <FileConstants.au3>
#include <MsgBoxConstants.au3>

Global $SteamLoc = "C:\Program Files\Steam\Steam.exe"

Global $loginName = $CmdLine[1]
Global $password = $CmdLine[2]

SignIn()

Func SignIn()
   KillSteam()
   Local $iPID = Run($SteamLoc, "", @SW_SHOWMAXIMIZED)
   _WinWaitActivate("Steam Login","")
   MouseMove(440,100)
   MouseDown("left")
   MouseMove(100,100)
   MouseUp("left")
   Send("{DEL}")
   Send($loginName)
   Send("{TAB}")
   Send($password)
   Send("{ENTER}")
   _WinWaitActivate("Steam","")
   Sleep(3000)
   KillSteam()
EndFunc

Func KillSteam()
    If ProcessExists("Steam.exe") Then
        ProcessClose("Steam.exe")
        ProcessWaitClose("Steam.exe")
    Else
EndIf
EndFunc

Func ActivateKey()
   _WinWaitActivate("Steam","")
   Sleep(2000)
   Send("{RWINDOWN}r{RWINUP}")
   _WinWaitActivate("Run","Type the name of a p")
   Send("steam://open/activateproduct{ENTER}")
EndFunc



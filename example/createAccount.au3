Func _Au3RecordSetup()
   Opt('WinWaitDelay',100)
   Opt('WinDetectHiddenText',1)
   Opt('MouseCoordMode',0)
   Local $aResult = DllCall('User32.dll', 'int', 'GetKeyboardLayoutNameW', 'wstr', '')
   If $aResult[1] <> '00000409' Then
        MsgBox(64, 'Warning', 'Recording has been done under a different Keyboard layout' & @CRLF & '(00000409->' & $aResult[1] & ')')
   EndIf
EndFunc

Func _WinWaitActivate($title,$text,$timeout=0)
    WinWait($title,$text,$timeout)
    If Not WinActive($title,$text) Then WinActivate($title,$text)
    WinWaitActive($title,$text,$timeout)
EndFunc

_AU3RecordSetup()

Global $SteamLoc = "C:\Program Files\Steam\Steam.exe"
Global $username = $CmdLine[1]
Global $password = $CmdLine[2]
Global $domain = "@betloot.co.uk"

MakeAccount()

Func MakeAccount()
   KillSteam()
   Local $iPID = Run($SteamLoc, "")
   _WinWaitActivate("Steam Login","")
   MouseClick("left",377,247,1)
   _WinWaitActivate("Steam","")
   MouseClick("left",342,289,1)
   _WinWaitActivate("Create a Steam Account","")
   Send("{ENTER}")
   Sleep(200)
   Send("{ENTER}")
   Sleep(200)
   Send("{ENTER}")
   Send($username)
   Sleep(200)
   Send("{TAB}")
   Sleep(200)
   Send($password)
   Sleep(200)
   Send("{TAB}")
   Sleep(200)
   Send($password)
   Sleep(200)
   Send("{TAB}")
   Send("{TAB}")
   Sleep(500)
   Send("{TAB}")
   Send("{TAB}")
   Sleep(500)
   MouseClick("left",290,408,1) ; Confirm
   _WinWaitActivate("Steam - working","")
   Sleep(1000)
   _WinWaitActivate("Create a Steam Account","")
   Sleep(500)
   Send($username)
   Send($domain)
   Sleep(500)
   Send("{TAB}")
   Sleep(500)
   Send($username)
   Send($domain)
   Sleep(500)
   MouseClick("left",290,408,1) ; Confirm
   _WinWaitActivate("Steam - working","")
   Sleep(1000)
   _WinWaitActivate("Create a Steam Account","")
   Sleep(1000)
   MouseClick("left",287,205,1)
   Sleep(500)
   MouseClick("left",287,205,1)
   Send("highschool")
   Send("{ENTER}") ; Confirm
   _WinWaitActivate("Steam - Working","")
   Sleep(1000)
   _WinWaitActivate("Steam - Create Account","")
   Send("{ENTER}")
   Sleep(500)
   Send("{ENTER}")
   Sleep(500)
   _WinWaitActivate("Steam","")
   Sleep(1500)
   Send("{RWINDOWN}r{RWINUP}")
   _WinWaitActivate("Run","")
   Send("steam://settings")
   Send("{ENTER}") ; enter run command
   _WinWaitActivate("Settings","")
   MouseClick("left",385,157,1) ; click the steam email button
   _WinWaitActivate("Verify Email","")
   Send("{ENTER}")
   Send("{ENTER}")
   _WinWaitActivate("Settings","")
   KillSteam()
EndFunc ;MakeAccount

Func KillSteam()
    If ProcessExists("Steam.exe") Then
        ProcessClose("Steam.exe")
        ProcessWaitClose("Steam.exe")
    Else
    EndIf
EndFunc

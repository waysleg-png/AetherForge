# Скрипт очистки Standby List (Требует прав Администратора)
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class MemoryCleaner {
    [DllImport("ntdll.dll")]
    public static extern uint NtSetSystemInformation(int SystemInformationClass, IntPtr SystemInformation, int SystemInformationLength);

    [DllImport("advapi32.dll", SetLastError = true)]
    public static extern bool OpenProcessToken(IntPtr ProcessHandle, uint DesiredAccess, out IntPtr TokenHandle);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr GetCurrentProcess();

    [DllImport("advapi32.dll", SetLastError = true)]
    public static extern bool LookupPrivilegeValue(string lpSystemName, string lpName, out long lpLuid);

    [DllImport("advapi32.dll", SetLastError = true)]
    public static extern bool AdjustTokenPrivileges(IntPtr TokenHandle, bool DisableAllPrivileges, ref TOKEN_PRIVILEGES NewState, int BufferLength, IntPtr PreviousState, IntPtr ReturnLength);

    [StructLayout(LayoutKind.Sequential, Pack = 1)]
    public struct TOKEN_PRIVILEGES {
        public int PrivilegeCount;
        public long Luid;
        public int Attributes;
    }

    public static void ClearMemory() {
        IntPtr hToken = IntPtr.Zero;
        OpenProcessToken(GetCurrentProcess(), 0x0020, out hToken);
        
        long luid = 0;
        LookupPrivilegeValue(null, "SeProfileSingleProcessPrivilege", out luid);
        
        TOKEN_PRIVILEGES tp = new TOKEN_PRIVILEGES();
        tp.PrivilegeCount = 1;
        tp.Luid = luid;
        tp.Attributes = 0x00000002; // SE_PRIVILEGE_ENABLED
        
        AdjustTokenPrivileges(hToken, false, ref tp, 0, IntPtr.Zero, IntPtr.Zero);

        // 1. Очистка Standby List (SystemMemoryListInformation = 80, Empty = 4)
        int systemInformationLength = 4;
        IntPtr buffer = Marshal.AllocHGlobal(systemInformationLength);
        Marshal.WriteInt32(buffer, 4);
        NtSetSystemInformation(80, buffer, systemInformationLength);
        Marshal.FreeHGlobal(buffer);

        // 2. Очистка Working Sets (SystemFileCacheInformation = 21, Empty = 0)
        systemInformationLength = 4;
        buffer = Marshal.AllocHGlobal(systemInformationLength);
        Marshal.WriteInt32(buffer, 0);
        NtSetSystemInformation(21, buffer, systemInformationLength);
        Marshal.FreeHGlobal(buffer);
    }
}
"@

# Запускаем очистку
[MemoryCleaner]::ClearMemory()
Write-Output "SUCCESS"
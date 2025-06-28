============ Memory Table ============
Cell 0: the syscall number
Cell 1: the syscall argument count
Cell 2 to Cell 100: syscall arguments
Cell 0: after execution is the output

========= Interpreter Notes ==========

Arguments types:
0 : Normal
1 : Pointer to memory
1 : Pointer to cell

======================================


=========== Brainfuck code ===========

// First we need to call the socket syscall

socket(int domain, int type, int protocol)
+++++ +++++
+++++ +++++
+++++ +++++
+++++ +++++
+>
+++> Arg count: 3

Arg 1: domain
(0) > Normal
+   > Len 1
++  > Content 2 (AF_INET)

Arg 2: type
(0) > Normal
+   > Len 1
+   > Content 2 (SOCK_STREAM)

Arg 3: protocol
(0) > Normal
+   > Len 1
    > Content 0 (IPPROTO_TCP)

Return to cell 0
<<<<<<<<<<<
Execute the syscall
% 


Move the output of the syscall from cell 0 to cell 5 (content for the socketfd argument)
>>>>>[-]<<<<<[->>>>>+<<<<<]

setsockopt(int sockfd, int level, int optname, const void *optval, socklen_t optlen)
+++++ +++++
+++++ +++++
+++++ +++++
+++++ +++++
+++++ +++++
++++> 54 is the syscall number for setsockopt

[-]
+++++>[-] Arg count: 5

Arg 1: sockfd
(0) >[-] Normal
+   >[-] Len 1
    >[-] Content (already moved from socket syscall output)

Arg 2: level
(0) >[-] Normal
+   >[-] Len 1
+   >[-] Content 1 (SOL_SOCKET)

Arg 3: optname
(0) >[-] Normal
+   >[-] Len 1
+   >[-] Content 1 (SO_REUSEADDR)

Arg 4: optval
+(1)>[-] Pointer to memory
+   >[-] Len 1
+   >[-] Content 1 (enable SO_REUSEADDR - store 1 in memory)

Arg 5: optlen
(0) >[-] Normal
+   >[-] Len 1
++++>[-] Content 4 (sizeof(int) - size of the optval)

Return to cell 0
<<<<<<<<<<<<<<<<<
Execute the syscall
%

[-]
Now we need to bind the socket to an address
bind(int sockfd, const struct sockaddr *addr, socklen_t addrlen)
+++++ +++++
+++++ +++++
+++++ +++++
+++++ +++++
+++++ +++++
+++++ ++++> 49 is the syscall number for bind

[-]
+++> Arg count: 3

Arg 1: sockfd
Don't change this, cells 2 to 5 already contains the socketfd from the previous syscall
>>>[-]
Arg 2: const struct sockaddr *addr
  We construct this address struct byte by byte for localhost:4000
  Begin in cell 6
  + >  Arg type: Buffer (struct)
  ++++++++++++++++ >  Arg length:

  sockaddr struct contents
  ++  > Address family
  (0) >
  +++++++++++++++ >
  ++++++++++++++++++++++++++++++++++++++++
  ++++++++++++++++++++++++++++++++++++++++
  ++++++++++++++++++++++++++++++++++++++++
  ++++++++++++++++++++++++++++++++++++++++ > 0x0f 0xa0 = port 4000
  (0) > Accept Any
  (0) >
  (0) >
  (0) >
  ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  ++++++++++++++++ > 144
  +++++++ > 7
  ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ > 64
  (0) >
  (0) >
  (0) >
  (0) >
  (0) >



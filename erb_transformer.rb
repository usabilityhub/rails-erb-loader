require 'erubis'

delimiter = ARGV[0]
puts "#{delimiter}#{Erubis::Eruby.new(STDIN.read).result}#{delimiter}"

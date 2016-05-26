require 'erb'

delimiter = ARGV[0]
puts "#{delimiter}#{ERB.new(STDIN.read).result}#{delimiter}"
